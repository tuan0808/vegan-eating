// src/lib/actions/veganize.ts
"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import {
    checkEligibility,
    checkRate,
    findCached,
    hashInput,
    callAnthropic,
    logRequest,
    type VeganizeResult,
} from "@/lib/veganize";

export type VeganizeResponse = {
    ok: boolean;
    error?: string;
    result?: VeganizeResult;
    requestId?: string;   // used by saveVeganizedRecipe / "Save & test"
    remaining?: number;
};

const HARD_MAX = 20000;

function clientIp(): string | null {
    const h = headers();
    const fwd = h.get("x-forwarded-for");
    return fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip");
}

async function inputCap(): Promise<number> {
    const row = await prisma.setting.findUnique({ where: { key: "veganize.maxInputChars" } });
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.min(n, HARD_MAX) : 6000;
}

// Generate a recipe. Logs the request (always) but does NOT create a submission —
// nothing reaches the moderation queue until the member saves it.
export async function veganizeRecipe(rawInput: string): Promise<VeganizeResponse> {
    const me = await requireUser();

    const user = await prisma.user.findUnique({
        where: { id: me.id },
        select: { emailVerified: true, banned: true, createdAt: true },
    });
    if (!user) return { ok: false, error: "We couldn't verify your account. Try signing in again." };

    const elig = await checkEligibility(user);
    if (!elig.ok) return { ok: false, error: elig.reason };

    const cap = await inputCap();
    const input = String(rawInput ?? "").slice(0, cap).trim();
    if (input.length < 3) {
        return { ok: false, error: "Type a few ingredients you have, or paste a recipe to veganize." };
    }

    const inputHash = hashInput(input);

    // Cache: same input from the same member in the last 24h — no API call, no quota burn.
    const cached = await findCached(me.id, inputHash);
    if (cached) {
        try {
            const result = JSON.parse(cached.output) as VeganizeResult;
            const rate = await checkRate(me.id);
            return { ok: true, result, requestId: cached.id, remaining: rate.remaining };
        } catch {
            /* unreadable cache — fall through to a fresh generation */
        }
    }

    const rate = await checkRate(me.id);
    if (!rate.ok) return { ok: false, error: rate.reason, remaining: rate.remaining };

    let result: VeganizeResult;
    try {
        result = await callAnthropic(input);
    } catch (e) {
        console.error("veganize:", e);
        return { ok: false, error: "The kitchen assistant is unavailable right now. Please try again in a moment.", remaining: rate.remaining };
    }

    const row = await logRequest({
        userId: me.id,
        inputHash,
        input,
        output: JSON.stringify(result),
        cached: false,
        ip: clientIp(),
    });

    // Show the log immediately even though no submission exists yet.
    revalidatePath("/admin/veganize");

    if (result.notRecipe) {
        return { ok: false, error: "That doesn't look like food we can work with — list a few ingredients or paste a recipe.", remaining: Math.max(0, rate.remaining - 1) };
    }

    return { ok: true, result, requestId: row.id, remaining: Math.max(0, rate.remaining - 1) };
}

// One-click save: turn a logged generation into a private, pending submission.
// Allowed for the request's owner or any admin (admins can promote from the log).
// Idempotent — saving twice returns the same submission.
export async function saveVeganizedRecipe(
    requestId: string
): Promise<{ ok: boolean; error?: string; submissionId?: string }> {
    const me = await requireUser();

    const req = await prisma.veganizeRequest.findUnique({
        where: { id: requestId },
        select: { id: true, userId: true, output: true },
    });
    if (!req) return { ok: false, error: "That recipe is no longer available." };

    const isAdmin = me.role === "ADMIN";
    if (!isAdmin && req.userId !== me.id) {
        return { ok: false, error: "You can't save this recipe." };
    }

    const existing = await prisma.recipeSubmission.findFirst({
        where: { veganizeRequestId: req.id },
        select: { id: true },
    });
    if (existing) return { ok: true, submissionId: existing.id };

    let result: VeganizeResult;
    try {
        result = JSON.parse(req.output) as VeganizeResult;
    } catch {
        return { ok: false, error: "That recipe couldn't be read. Try generating it again." };
    }
    if (result.notRecipe) return { ok: false, error: "There's no recipe to save here." };

    // Credit the original member, even when an admin promotes it from the log.
    const owner = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { name: true, username: true },
    });
    const authorName = owner?.name ?? owner?.username ?? "Member";

    const sub = await prisma.recipeSubmission.create({
        data: {
            title: result.title || "Untitled vegan recipe",
            dietType: "VEGAN",
            ingredients: result.ingredients.join("\n"),
            method: result.method.join("\n"),
            prepMin: result.times.prepMin ?? null,
            cookMin: result.times.cookMin ?? null,
            readyMin: result.times.readyMin ?? null,
            images: "[]",
            status: "PENDING",
            userId: req.userId,
            authorName,
            source: "VEGANIZER",
            veganizeRequestId: req.id,
        },
        select: { id: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/admin/submissions");
    revalidatePath("/admin/veganize");
    return { ok: true, submissionId: sub.id };
}