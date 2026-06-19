// src/app/(auth)/login/actions.ts
"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";

export async function loginAction(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    // Friendly verification gate. authorize() already refuses unverified accounts,
    // but on its own that surfaces as a generic "invalid credentials" message —
    // confusing for someone who typed the RIGHT password and just hasn't verified.
    // So when the password is correct but the email isn't verified, we redirect to
    // the resend affordance instead. We only branch on a *correct* password, so this
    // can't be used to probe which accounts exist or which are unverified.
    //
    // Note: the bcrypt.compare below only runs for unverified accounts (the rare
    // edge case). Verified users skip it entirely and hash just once, in authorize().
    const user = await prisma.user.findUnique({
        where: { email },
        select: { password: true, emailVerified: true },
    });
    if (user?.password && !user.emailVerified) {
        const bcrypt = (await import("bcryptjs")).default;
        if (await bcrypt.compare(password, user.password)) {
            redirect("/login?error=unverified");
        }
    }

    try {
        await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    } catch (error) {
        // A successful signIn throws a redirect (NOT an AuthError) that must propagate.
        if (error instanceof AuthError) {
            redirect("/login?error=invalid");
        }
        throw error;
    }
}

/**
 * Re-issue and resend a verification link. Reached from the login page's resend
 * button (it reuses the email field already on the form via formAction).
 *
 * Always ends on the same neutral state regardless of whether the email exists,
 * is already verified, or is banned — so it can't be used to enumerate accounts.
 */
export async function resendVerificationAction(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (email) {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, emailVerified: true, banned: true },
        });

        if (user && !user.emailVerified && !user.banned) {
            // Light throttle: skip if a link was already issued in the last 60s, so
            // the button can't be mashed to spam someone's inbox.
            const recent = await prisma.emailVerificationToken.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                select: { createdAt: true },
            });
            const tooSoon = recent && Date.now() - recent.createdAt.getTime() < 60_000;

            if (!tooSoon) {
                try {
                    const token = await createVerificationToken(user.id);
                    await sendVerificationEmail(email, token);
                } catch (e) {
                    console.error("Resend verification failed:", e);
                }
            }
        }
    }

    redirect("/login?resent=1");
}