// src/app/register/actions.ts
"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { verifyTurnstile } from "@/lib/turnstile";
import { createVerificationToken } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";

const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const captcha = formData.get("cf-turnstile-response");

    // Bot gate FIRST — verify the Turnstile token before doing any work.
    const h = headers();
    const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const human = await verifyTurnstile(captcha ? String(captcha) : null, ip);
    if (!human) redirect("/register?error=captcha");

    // Lightweight validation (no extra deps).
    if (!name || name.length > 60) redirect("/register?error=invalid");
    if (!USERNAME_RE.test(username)) redirect("/register?error=invalid");
    if (!EMAIL_RE.test(email)) redirect("/register?error=invalid");
    if (password.length < 8 || password.length > 100) redirect("/register?error=invalid");

    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
        select: { id: true },
    });
    if (existing) redirect("/register?error=taken");

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { name, username, email, password: hash, role: "MEMBER" },
    });

    // Send the verification email. Don't fail signup if the mail send hiccups —
    // they can request a fresh link later.
    try {
        const token = await createVerificationToken(user.id);
        await sendVerificationEmail(email, token);
    } catch (e) {
        console.error("Verification email failed to send:", e);
    }

    // Log the new member straight in. They can browse immediately; posting and
    // commenting wait on email verification (enforced in the anti-spam gate).
    try {
        await signIn("credentials", { email, password, redirectTo: "/dashboard?verify=sent" });
    } catch (error) {
        // A successful signIn throws a redirect (NOT an AuthError) that must propagate.
        if (error instanceof AuthError) {
            redirect("/login");
        }
        throw error;
    }
}