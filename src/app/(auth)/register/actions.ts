// src/app/(auth)/register/actions.ts
"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyTurnstile } from "@/lib/turnstile";
import { createVerificationToken } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";
import { sendRedditEvent, redditMatchFromRequest } from "@/lib/reddit-capi";

const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const captcha = formData.get("cf-turnstile-response");

    // Bot gate FIRST — verify the Turnstile token before doing any work.
    const h = await headers();
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

    // Reddit SignUp conversion (server side / CAPI). Shares conversionId with the
    // pixel twin that fires on the login page (see redirect below) so Reddit
    // de-dupes the pair. Awaited so it flushes before the redirect ends the
    // request on serverless; the call self-guards and never throws.
    const conversionId = randomUUID();
    const match = await redditMatchFromRequest();
    await sendRedditEvent({
        eventName: "SignUp",
        conversionId,
        email,
        externalId: user.id,
        ...match,
    });

    // Issue + send the verification link. We do NOT log the new user in anymore —
    // login now requires a verified email, so auto-login would immediately reject
    // them. Instead we send them to the login page with a "check your inbox" notice;
    // if the mail hiccups they can resend from there. We don't fail signup on a
    // mail error — the account exists and the link can be re-requested.
    try {
        const token = await createVerificationToken(user.id);
        await sendVerificationEmail(email, token);
    } catch (e) {
        console.error("Verification email failed to send:", e);
    }

    // `sc` carries the conversion id to the login page, where the browser pixel
    // fires SignUp with the same id → deduped against the CAPI event above.
    redirect(`/login?registered=1&sc=${conversionId}`);
}