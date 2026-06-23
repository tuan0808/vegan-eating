// src/app/(app)/settings/actions.ts
"use server";

import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
    createPasswordResetToken,
    peekPasswordResetToken,
    consumePasswordResetToken,
} from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";

export type PwResult = { ok: boolean; error?: string };

// Step 1 — from the settings page. A logged-in user can't change their password
// directly; we email them a single-use link to re-prove email ownership first.
export async function requestPasswordReset(
    _prev: PwResult,
    _formData: FormData,
): Promise<PwResult> {
    const me = await requireUser();

    // session.user.email isn't guaranteed to be populated by our callbacks, so
    // read the address of record straight from the DB.
    const user = await prisma.user.findUnique({
        where: { id: me.id },
        select: { email: true },
    });
    if (!user?.email) return { ok: false, error: "No email is on file for this account." };

    const token = await createPasswordResetToken(me.id);
    try {
        await sendPasswordResetEmail(user.email, token);
    } catch (e) {
        console.error("Password reset email failed to send:", e);
        return { ok: false, error: "Couldn't send the email. Please try again in a moment." };
    }
    return { ok: true };
}

// Step 2 — from the reset form behind the emailed link. Requires BOTH a live
// session and a valid token that belongs to that session's user.
export async function resetPassword(_prev: PwResult, formData: FormData): Promise<PwResult> {
    const me = await requireUser();
    const token = String(formData.get("token") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password.length < 8 || password.length > 100) {
        return { ok: false, error: "Password must be between 8 and 100 characters." };
    }
    if (password !== confirm) {
        return { ok: false, error: "Those passwords don't match." };
    }

    const peek = await peekPasswordResetToken(token);
    if (peek.status !== "valid") {
        return {
            ok: false,
            error:
                peek.status === "expired"
                    ? "That link has expired. Request a new one from settings."
                    : "That link is invalid or has already been used.",
        };
    }
    // Bind the token to the logged-in user — a valid token for someone else
    // must never let the current session change a password.
    if (peek.userId !== me.id) {
        return { ok: false, error: "This link isn't for the account you're signed in to." };
    }

    const hash = await bcrypt.hash(password, 10);
    const status = await consumePasswordResetToken(token, hash);
    if (status !== "valid") {
        return { ok: false, error: "That link is no longer valid. Request a new one." };
    }
    return { ok: true };
}
