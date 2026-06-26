// src/lib/actions/community.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { createVerificationToken } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";

const clamp = (s: string, max: number) => s.slice(0, max).trim();

/* ------------------------------------------------------------------ *
 * Messaging
 * ------------------------------------------------------------------ */
export async function sendMessage(formData: FormData) {
    const me = await requireUser();
    const toUsername = String(formData.get("to") ?? "").trim();
    const body = clamp(String(formData.get("body") ?? ""), 4000);
    if (!toUsername || !body) return;

    const recipient = await prisma.user.findUnique({
        where: { username: toUsername },
        select: { id: true, banned: true },
    });
    if (!recipient || recipient.id === me.id || recipient.banned) return;

    await prisma.message.create({
        data: { senderId: me.id, recipientId: recipient.id, body },
    });

    revalidatePath(`/messages/${toUsername}`);
    revalidatePath("/messages");
    revalidatePath("/dashboard");
}

// Mark every message FROM this partner TO me as read. Called when a
// conversation is opened.
export async function markConversationRead(partnerId: string) {
    const me = await requireUser();
    await prisma.message.updateMany({
        where: { senderId: partnerId, recipientId: me.id, readAt: null },
        data: { readAt: new Date() },
    });
    revalidatePath("/messages");
    revalidatePath("/dashboard");
}

/* ------------------------------------------------------------------ *
 * Profile (public-facing fields)
 * ------------------------------------------------------------------ */
export async function updateProfile(formData: FormData) {
    const me = await requireUser();

    const name = clamp(String(formData.get("name") ?? ""), 80);
    const bio = clamp(String(formData.get("bio") ?? ""), 600);
    const location = clamp(String(formData.get("location") ?? ""), 120);
    let website = clamp(String(formData.get("website") ?? ""), 200);
    const avatarUrl = clamp(String(formData.get("avatarUrl") ?? ""), 400);
    const showActivity = formData.get("showActivity") === "on";

    // Light normalisation so a bare "example.com" still links.
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

    await prisma.user.update({
        where: { id: me.id },
        data: {
            name: name || null,
            bio: bio || null,
            location: location || null,
            website: website || null,
            avatarUrl: avatarUrl || null,
            showActivity,
        },
    });

    revalidatePath("/profile");
    const updated = await prisma.user.findUnique({
        where: { id: me.id },
        select: { username: true },
    });
    if (updated) revalidatePath(`/u/${updated.username}`);
}

/* ------------------------------------------------------------------ *
 * Account (email). Username + password are sensitive — see notes below.
 * ------------------------------------------------------------------ */
export type AccountResult = { ok: boolean; error?: string };

const EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Live check for the settings form: does `typed` match the signed-in user's
 *  email of record? Only ever reveals a yes/no for the caller's OWN account, so
 *  it's not an enumeration oracle for other users. */
export async function confirmCurrentEmail(typed: string): Promise<boolean> {
    const me = await requireUser();
    const value = String(typed ?? "").trim().toLowerCase();
    if (!value) return false;
    const row = await prisma.user.findUnique({ where: { id: me.id }, select: { email: true } });
    return !!row?.email && row.email.toLowerCase() === value;
}

export async function updateAccount(
    _prev: AccountResult,
    formData: FormData,
): Promise<AccountResult> {
    const me = await requireUser();
    const email = clamp(String(formData.get("email") ?? ""), 200).toLowerCase();
    const confirmCurrent = String(formData.get("confirmCurrent") ?? "").trim().toLowerCase();

    if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid new email address." };

    const current = await prisma.user.findUnique({
        where: { id: me.id },
        select: { email: true, emailChangedAt: true },
    });
    if (!current?.email) return { ok: false, error: "No email is on file for this account." };

    // Identity gate: must confirm the CURRENT email exactly (defends a hijacked
    // session where the attacker can't see the obfuscated address).
    if (confirmCurrent !== current.email.toLowerCase()) {
        return { ok: false, error: "The current email you entered doesn't match our records." };
    }
    if (email === current.email.toLowerCase()) {
        return { ok: false, error: "That's already your email address." };
    }

    // 24-hour cooldown between changes.
    if (current.emailChangedAt && Date.now() - current.emailChangedAt.getTime() < EMAIL_COOLDOWN_MS) {
        const hrs = Math.ceil((EMAIL_COOLDOWN_MS - (Date.now() - current.emailChangedAt.getTime())) / 3_600_000);
        return { ok: false, error: `You can only change your email once every 24 hours — try again in about ${hrs} hour${hrs === 1 ? "" : "s"}.` };
    }

    const taken = await prisma.user.findFirst({ where: { email, NOT: { id: me.id } }, select: { id: true } });
    if (taken) return { ok: false, error: "That email is already in use." };

    await prisma.user.update({
        where: { id: me.id },
        data: { email, emailVerified: null, emailChangedAt: new Date() },
    });

    try {
        const token = await createVerificationToken(me.id);
        await sendVerificationEmail(email, token);
    } catch (e) {
        console.error("verification email failed:", e);
    }

    revalidatePath("/settings");
    return { ok: true };
}

/** Resend the verification link to the signed-in user's current (unverified)
 *  email — for the "resend" link after an email change. Throttled to 60s. */
export async function resendMyVerification(): Promise<AccountResult> {
    const me = await requireUser();
    const user = await prisma.user.findUnique({
        where: { id: me.id },
        select: { email: true, emailVerified: true },
    });
    if (!user?.email) return { ok: false, error: "No email on file." };
    if (user.emailVerified) return { ok: true };

    const recent = await prisma.emailVerificationToken.findFirst({
        where: { userId: me.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
    });
    if (recent && Date.now() - recent.createdAt.getTime() < 60_000) return { ok: true };

    try {
        const token = await createVerificationToken(me.id);
        await sendVerificationEmail(user.email, token);
    } catch (e) {
        console.error("resend verification failed:", e);
        return { ok: false, error: "Couldn't resend right now. Try again shortly." };
    }
    return { ok: true };
}