// src/app/(auth)/register/actions.ts
"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyTurnstile } from "@/lib/turnstile";
import { isLikelyRandomUsername } from "@/lib/bot-heuristics";
import { createVerificationToken } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";
import { sendRedditEvent, redditMatchFromRequest } from "@/lib/reddit-capi";
import { normalizeEmail } from "@/lib/email-normalize";
import { isDisposableEmail } from "@/lib/disposable-email";
import { getLocalConfig, giveawayStatus, marketForZip, normalizeIgHandle, normalizeZip } from "@/lib/local-markets";
import { EMAIL_VERIFICATION_REQUIRED } from "@/lib/auth-flags";
import { sendWelcomeToNewMember } from "@/lib/welcome";

const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Flow = {
    /** Where validation errors redirect back to. */
    errorPath: string;
    /** IG + ZIP required, tags the account as a giveaway signup. */
    local?: { campaign: string };
};

export async function registerAction(formData: FormData) {
    return createAccount(formData, { errorPath: "/register" });
}

export async function localRegisterAction(formData: FormData) {
    const campaign = String(formData.get("campaign") ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "whole-foods";
    return createAccount(formData, { errorPath: "/whole-foods", local: { campaign } });
}

async function createAccount(formData: FormData, flow: Flow) {
    const fail = (code: string): never => redirect(`${flow.errorPath}?error=${code}`);
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const captcha = formData.get("cf-turnstile-response");

    // Bot gate FIRST — verify the Turnstile token before doing any work.
    const h = await headers();
    const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const human = await verifyTurnstile(captcha ? String(captcha) : null, ip);
    if (!human) fail("captcha");

    // Refuse signups from a blocklisted IP. The admin "block this bot cluster"
    // action bans existing accounts from an IP; this stops that same IP from
    // simply registering fresh ones. Best-effort — a null IP (local/dev) skips it.
    if (ip) {
        const blocked = await prisma.blockedIp.findUnique({ where: { ip } });
        if (blocked) fail("blocked");
    }

    // The per-IP signup cap was lifted — accounts are now reviewed/managed manually,
    // so legitimate users behind a shared exit (office, campus, CGNAT mobile carrier)
    // are no longer turned away after the first signup. The signup IP is still recorded
    // below so the admin "Duplicate signups" panel and block-cluster action keep working.

    // Lightweight validation (no extra deps). Display name is no longer collected
    // at signup — it starts null and users can add one later in Settings; every
    // byline falls back to the username (name ?? username) until they do.
    if (!USERNAME_RE.test(username)) fail("invalid");
    if (!EMAIL_RE.test(email)) fail("invalid");
    if (password.length < 8 || password.length > 100) fail("invalid");
    if (isDisposableEmail(email)) fail("disposable");

    // IG + ZIP: optional on /register, required on the giveaway form. A filled-in
    // but malformed value is rejected either way rather than silently dropped.
    const igRaw = String(formData.get("igHandle") ?? "").trim();
    const zipRaw = String(formData.get("zipCode") ?? "").trim();
    const igHandle = normalizeIgHandle(igRaw);
    const zipCode = normalizeZip(zipRaw);
    if (igRaw && !igHandle) fail("ig");
    if ((zipRaw && !zipCode) || (flow.local && !zipCode)) fail("zip");
    const localCfg = await getLocalConfig();
    const localMarket = marketForZip(localCfg.markets, zipCode);

    // A machine-random username is a confirmed bot — no human types
    // "XacKLGmIgXuJcXZLHlxWj". Reject the signup AND blocklist the IP so the same
    // source can't just retry. Reuses the generic "invalid" error so the gate
    // isn't advertised to whoever's scripting it. Threshold is tuned strict
    // (see isLikelyRandomUsername) since this acts with no human review.
    if (isLikelyRandomUsername(username)) {
        if (ip) {
            await prisma.blockedIp.upsert({
                where: { ip },
                update: { reason: "Random username (bot signup)" },
                create: { ip, reason: "Random username (bot signup)" },
            });
        }
        fail("invalid");
    }

    // Canonical inbox: blocks the Gmail dot/+tag trick where one mailbox spawns many
    // "unique" addresses. A collision on the normalized form counts as taken even when
    // the raw address differs (e.g. j.doe@ vs jdoe@ → same gmail inbox).
    const normalizedEmail = normalizeEmail(email);
    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }, { normalizedEmail }] },
        select: { id: true },
    });
    if (existing) fail("taken");

    // One account per Instagram handle, so one real IG account can't back a pile
    // of giveaway entries. Handles are stored normalised (lowercase, no "@").
    if (igHandle && (await prisma.user.findFirst({ where: { igHandle }, select: { id: true } }))) fail("igtaken");

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        // Record the signup IP so the admin "Duplicate signups" panel can cluster
        // accounts by origin and the block-cluster action can ban a bot farm in one
        // click. Conditional spread mirrors the login path — a null IP writes nothing.
        data: {
            username, email, normalizedEmail, password: hash, role: "MEMBER",
            // Verification is currently disabled (see auth-flags) — new accounts are
            // born verified so they can log in and post immediately, and so the
            // "prune never-verified" cron never touches them. Flip the flag to require
            // the email round-trip again.
            ...(EMAIL_VERIFICATION_REQUIRED ? {} : { emailVerified: new Date() }),
            ...(ip ? { signupIp: ip } : {}),
            igHandle, zipCode, localMarket,
            ...(flow.local
                ? {
                      signupSource: `local:${flow.local.campaign}`,
                      ...(giveawayStatus(localCfg.giveaway) === "open" ? { giveawayEnteredAt: new Date() } : {}),
                  }
                : {}),
        },
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

    // Issue + send the verification link — ONLY when verification is required. The
    // account was created unverified in that case; we send them to the login page
    // with a "check your inbox" notice and they can resend from there if the mail
    // hiccups. We don't fail signup on a mail error — the account exists and the link
    // can be re-requested. When verification is disabled the account is already
    // verified above, so there's nothing to send.
    if (EMAIL_VERIFICATION_REQUIRED) {
        try {
            const token = await createVerificationToken(user.id);
            await sendVerificationEmail(email, token);
        } catch (e) {
            console.error("Verification email failed to send:", e);
        }
    } else {
        // No verify step → send the one-time welcome now. Normally this fires when a
        // user verifies; with verification disabled, signup is the moment they join.
        // Self-guards on the admin enable/test-mode settings and never throws.
        await sendWelcomeToNewMember(user.id);
    }

    // `sc` carries the conversion id to the login page, where the browser pixel
    // fires SignUp with the same id → deduped against the CAPI event above.
    // The giveaway flow lands on its progress page (verify email → follow on IG)
    // instead; it fires the same pixel SignUp from `sc`.
    if (flow.local) redirect(`/whole-foods/next?sc=${conversionId}`);
    redirect(`/login?registered=1&sc=${conversionId}`);
}