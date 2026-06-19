// src/lib/veganize.ts
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Tunable caps — all live in the Setting table so you can change them without a
// redeploy. Defaults are used until a row exists.
// ---------------------------------------------------------------------------
const DEFAULTS = {
    "veganize.dailyCap": 5,
    "veganize.cooldownSec": 20,
    "veganize.globalDailyCap": 300,
    "veganize.minAccountAgeHours": 24,
    "veganize.maxInputChars": 6000,
};

async function num(key: keyof typeof DEFAULTS): Promise<number> {
    const row = await prisma.setting.findUnique({ where: { key } });
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) ? n : DEFAULTS[key];
}

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

export function hashInput(input: string): string {
    return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

// ---------------------------------------------------------------------------
// Eligibility — who is even allowed to use the tool. Pass the full User record.
// ---------------------------------------------------------------------------
export type EligibilityUser = {
    emailVerified: Date | null;
    banned: boolean;
    createdAt: Date;
};

export async function checkEligibility(
    user: EligibilityUser
): Promise<{ ok: boolean; reason?: string }> {
    if (user.banned) return { ok: false, reason: "Your account can't use this feature." };
    if (!user.emailVerified) {
        return { ok: false, reason: "Verify your email address first, then you can veganize recipes." };
    }
    const minHours = await num("veganize.minAccountAgeHours");
    const ageHours = (Date.now() - new Date(user.createdAt).getTime()) / 36e5;
    if (ageHours < minHours) {
        return {
            ok: false,
            reason: `New accounts can veganize recipes after ${minHours} hours — hang tight a little longer.`,
        };
    }
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Rate / quota gates. Returns the first thing that's blocked, plus the user's
// remaining allowance for the day (for friendly UI).
// ---------------------------------------------------------------------------
export async function checkRate(
    userId: string
): Promise<{ ok: boolean; reason?: string; remaining: number }> {
    const since = startOfToday();
    const [dailyCap, cooldownSec, globalCap, usedToday, globalToday, last] = await Promise.all([
        num("veganize.dailyCap"),
        num("veganize.cooldownSec"),
        num("veganize.globalDailyCap"),
        prisma.veganizeRequest.count({ where: { userId, cached: false, createdAt: { gte: since } } }),
        prisma.veganizeRequest.count({ where: { cached: false, createdAt: { gte: since } } }),
        prisma.veganizeRequest.findFirst({
            where: { userId, cached: false },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        }),
    ]);

    const remaining = Math.max(0, dailyCap - usedToday);

    if (globalToday >= globalCap) {
        return { ok: false, remaining, reason: "The kitchen's hit today's limit — please try again tomorrow." };
    }
    if (usedToday >= dailyCap) {
        return { ok: false, remaining: 0, reason: `You've used all ${dailyCap} of today's veganizes. They reset tomorrow.` };
    }
    if (last) {
        const waited = (Date.now() - new Date(last.createdAt).getTime()) / 1000;
        if (waited < cooldownSec) {
            const left = Math.ceil(cooldownSec - waited);
            return { ok: false, remaining, reason: `One sec — try again in ${left}s.` };
        }
    }
    return { ok: true, remaining };
}

// Per-user cache: same recipe submitted again recently returns the prior result
// with no API call and no quota burn.
export async function findCached(userId: string, inputHash: string) {
    const since = new Date(Date.now() - 24 * 36e5);
    return prisma.veganizeRequest.findFirst({
        where: { userId, inputHash, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        select: { id: true, output: true },
    });
}

// ---------------------------------------------------------------------------
// The result contract the model returns (and the UI renders).
// ---------------------------------------------------------------------------
export type VeganizeSwap = {
    original: string;
    substitute: string;
    reason: string;
    tip: string;
};

export type VeganizeResult = {
    notRecipe: boolean;
    title: string;
    summary: string;
    swaps: VeganizeSwap[];
    ingredients: string[];
    method: string[];
    notes: string[];
    times: { prepMin: number | null; cookMin: number | null; readyMin: number | null };
};

const SYSTEM_PROMPT = `You are the kitchen assistant for "vegan eating", a warm, honest, no-nonsense vegan recipe site.

A member will give you ONE of two things:
  (a) a recipe (ingredients + method) that may contain meat, dairy, eggs, or honey — convert it into a fully vegan version that is realistic and cookable; or
  (b) a loose list of ingredients they have on hand (what is in their fridge or pantry) — invent ONE realistic vegan recipe built around those ingredients. You may assume basic staples are available (oil, salt, pepper, common dried herbs and spices, flour, water, sugar); do not rely on ingredients they did not mention beyond those staples.

Work out which case it is from the input.

Return ONLY a single JSON object — no markdown, no code fences, no text before or after it — matching exactly this shape:
{
  "notRecipe": boolean,
  "title": string,
  "summary": string,
  "swaps": [{ "original": string, "substitute": string, "reason": string, "tip": string }],
  "ingredients": [string],
  "method": [string],
  "notes": [string],
  "times": { "prepMin": number|null, "cookMin": number|null, "readyMin": number|null }
}

Rules:
- "swaps" lists animal ingredients you replaced from THEIR input, each with the vegan substitute, a short reason, and one practical tip. If they only gave plant ingredients (case b), "swaps" may be an empty array.
- "ingredients" is the COMPLETE vegan ingredient list with amounts. "method" is the full method as an array of steps.
- "notes" are brief caveats or "watch out for" tips (texture, timing, substitutions).
- Always give a clear "title" and a one-line "summary". Keep the whole thing tight and cookable — no backstory, no preamble, no filler steps.
- If the input is neither a recipe nor a usable list of food ingredients, return { "notRecipe": true } with all other fields empty/zero.`

function stripFences(s: string): string {
    return s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function asStringArray(v: unknown): string[] {
    return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

function intOrNull(v: unknown): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function normalize(raw: any): VeganizeResult {
    if (!raw || typeof raw !== "object") {
        return { notRecipe: true, title: "", summary: "", swaps: [], ingredients: [], method: [], notes: [], times: { prepMin: null, cookMin: null, readyMin: null } };
    }
    return {
        notRecipe: Boolean(raw.notRecipe),
        title: String(raw.title ?? ""),
        summary: String(raw.summary ?? ""),
        swaps: Array.isArray(raw.swaps)
            ? raw.swaps.map((s: any) => ({
                original: String(s?.original ?? ""),
                substitute: String(s?.substitute ?? ""),
                reason: String(s?.reason ?? ""),
                tip: String(s?.tip ?? ""),
            })).filter((s: VeganizeSwap) => s.original || s.substitute)
            : [],
        ingredients: asStringArray(raw.ingredients),
        method: asStringArray(raw.method),
        notes: asStringArray(raw.notes),
        times: {
            prepMin: intOrNull(raw?.times?.prepMin),
            cookMin: intOrNull(raw?.times?.cookMin),
            readyMin: intOrNull(raw?.times?.readyMin),
        },
    };
}

// ---------------------------------------------------------------------------
// The Anthropic call. Server-only. Key + model come from env.
// ---------------------------------------------------------------------------
export async function callAnthropic(input: string): Promise<VeganizeResult> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
            max_tokens: 2500,
            system: SYSTEM_PROMPT,
            messages: [{ role: "user", content: input }],
        }),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = (data?.content ?? [])
        .filter((b: any) => b?.type === "text")
        .map((b: any) => b.text)
        .join("\n")
        .trim();

    let parsed: any;
    try {
        parsed = JSON.parse(stripFences(text));
    } catch {
        throw new Error("Model returned malformed output");
    }
    return normalize(parsed);
}

export async function logRequest(args: {
    userId: string;
    inputHash: string;
    input: string;
    output: string;
    cached: boolean;
    ip?: string | null;
}) {
    return prisma.veganizeRequest.create({ data: args });
}