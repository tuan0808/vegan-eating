// src/lib/actions/community.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

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

export async function updateAccount(
    _prev: AccountResult,
    formData: FormData,
): Promise<AccountResult> {
    const me = await requireUser();
    const email = clamp(String(formData.get("email") ?? ""), 200).toLowerCase();

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return { ok: false, error: "Enter a valid email address." };
    }

    const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: me.id } },
        select: { id: true },
    });
    if (taken) return { ok: false, error: "That email is already in use." };

    await prisma.user.update({
        where: { id: me.id },
        // Changing email clears verification — re-verify on your existing flow.
        data: { email, emailVerified: null },
    });

    revalidatePath("/settings");
    return { ok: true };
}