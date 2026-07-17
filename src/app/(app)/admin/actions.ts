// src/app/admin/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/email-normalize";

const ROLES = ["MEMBER", "MODERATOR", "ADMIN"];
const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type MemberResult = { ok: boolean; error?: string };

export async function setUserRole(formData: FormData) {
    // Re-check on the server — never trust that the caller is an admin just because
    // the page rendered. Server actions are public endpoints.
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/dashboard");

    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "");

    if (!ROLES.includes(role)) redirect("/admin?error=role");
    // Block changing your own role so you can't accidentally lock yourself out.
    if (userId === session.user.id) redirect("/admin?error=self");

    await prisma.user.update({ where: { id: userId }, data: { role } });

    revalidatePath("/admin");
    redirect("/admin?ok=1");
}

/**
 * Admin edit of a member — display name, username, email, role, and ban state in one
 * save. Re-validates admin server-side (actions are public endpoints), enforces the
 * same field rules as signup, and keeps normalizedEmail in sync so the anti-bot dedupe
 * stays correct. You can't demote/promote yourself (lock-out guard); other own-profile
 * fields are fine to edit. Returns a result so the row can show inline feedback.
 */
export async function updateMember(
    userId: string,
    data: { name: string; username: string; email: string; role: string; banned: boolean },
): Promise<MemberResult> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { ok: false, error: "Not authorised." };
    if (!userId) return { ok: false, error: "Missing user." };

    const name = data.name.trim();
    const username = data.username.trim();
    const email = data.email.trim().toLowerCase();

    if (name.length > 60) return { ok: false, error: "Display name must be 60 characters or fewer." };
    if (!USERNAME_RE.test(username)) return { ok: false, error: "Username must be 3–24 letters, numbers, or underscores." };
    if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
    if (!ROLES.includes(data.role)) return { ok: false, error: "That isn't a valid role." };
    if (userId === session.user.id && data.role !== session.user.role) {
        return { ok: false, error: "You can't change your own role." };
    }

    // Uniqueness across OTHER accounts (raw email, username, and canonical inbox).
    const normalizedEmail = normalizeEmail(email);
    const clash = await prisma.user.findFirst({
        where: { id: { not: userId }, OR: [{ username }, { email }, { normalizedEmail }] },
        select: { username: true },
    });
    if (clash) return { ok: false, error: "That username or email is already taken by another account." };

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { name: name || null, username, email, normalizedEmail, role: data.role, banned: data.banned },
        });
    } catch {
        return { ok: false, error: "Couldn't save — that username or email may already be in use." };
    }
    revalidatePath("/admin");
    return { ok: true };
}

/**
 * Hard-delete a member. Every User relation cascades, so their content goes too.
 * Self-deletion is blocked. Returns a result for inline feedback.
 */
export async function deleteMember(userId: string): Promise<MemberResult> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { ok: false, error: "Not authorised." };
    if (!userId) return { ok: false, error: "Missing user." };
    if (userId === session.user.id) return { ok: false, error: "You can't delete your own account." };

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin");
    return { ok: true };
}