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
import { normalizeEmail } from "@/lib/email-normalize";

const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Max accounts allowed to register from a single IP. Set low to blunt bulk bot
// signups; 3 leaves room for a couple of real users behind one office/mobile-carrier
// (CGNAT) exit. Lower to 1–2 for stricter, raise if shared networks get rejected.
const SIGNUP_IP_CAP = 3;

export async function registerAction(formData: FormData) {
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

    // Refuse signups from a blocklisted IP. The admin "block this bot cluster"
    // action bans existing accounts from an IP; this stops that same IP from
    // simply registering fresh ones. Best-effort — a null IP (local/dev) skips it.
    if (ip) {
        const blocked = await prisma.blockedIp.findUnique({ where: { ip } });
        if (blocked) redirect("/register?error=blocked");
    }

    // Strict one-account-per-IP cap, enforced at submit (not first login). Any prior
    // account from this IP blocks a second registration outright — the bluntest brake
    // on bulk automated signups. Trade-off: shared exits (offices, campuses, and
    // especially CGNAT mobile carriers) put many real users behind one IP, so this can
    // reject legitimate people — loosen SIGNUP_IP_CAP if that bites. Null IP (dev) skips.
    if (ip) {
        const fromThisIp = await prisma.user.count({ where: { signupIp: ip } });
        if (fromThisIp >= SIGNUP_IP_CAP) redirect("/register?error=iplimit");
    }

    // Lightweight validation (no extra deps). Display name is no longer collected
    // at signup — it starts null and users can add one later in Settings; every
    // byline falls back to the username (name ?? username) until they do.
    if (!USERNAME_RE.test(username)) redirect("/register?error=invalid");
    if (!EMAIL_RE.test(email)) redirect("/register?error=invalid");
    if (password.length < 8 || password.length > 100) redirect("/register?error=invalid");

    // Canonical inbox: blocks the Gmail dot/+tag trick where one mailbox spawns many
    // "unique" addresses. A collision on the normalized form counts as taken even when
    // the raw address differs (e.g. j.doe@ vs jdoe@ → same gmail inbox).
    const normalizedEmail = normalizeEmail(email);
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }, { normalizedEmail }] },
        select: { id: true },
    });
    if (existing) redirect("/register?error=taken");

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        // Record the signup IP so the admin "Duplicate signups" panel can cluster
        // accounts by origin and the block-cluster action can ban a bot farm in one
        // click. Conditional spread mirrors the login path — a null IP writes nothing.
        data: { username, email, normalizedEmail, password: hash, role: "MEMBER", ...(ip ? { signupIp: ip } : {}) },
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