// src/lib/anti-spam.ts
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getAntiSpamConfig } from '@/lib/antispam-config'
import { countLinks, isNearDuplicate, accountAgeMs } from '@/lib/spam-heuristics'
export type GuardReason =
    | 'signin'
    | 'banned'
    | 'unverified'
    | 'onboarding'
    | 'blocked'
    | 'too_fast'
    | 'links'
    | 'duplicate'
    | 'cooldown'
    | 'hourly'
export type GuardOk = {
    ok: true
    userId: string
    authorName: string
    ip: string | null
    userAgent: string | null
    isProbation: boolean
}
export type GuardFail = { ok: false; reason: GuardReason; error: string }
export type GuardResult = GuardOk | GuardFail
/** Best-effort client identity from proxy headers (null locally — that's fine). */
export function getClientMeta() {
    const h = headers()
    const fwd = h.get('x-forwarded-for')
    const ip = (fwd ? fwd.split(',')[0]?.trim() : '') || h.get('x-real-ip') || null
    const userAgent = h.get('user-agent')
    return { ip, userAgent }
}
type RecentActivity = { lastAt: Date | null; lastHourCount: number; lastBody?: string | null }
/**
 * The single gate for every community write (comments, forum threads/posts).
 * Order: sign-in -> not banned -> email verified -> read welcome thread ->
 * IP not blocklisted -> content heuristics (too-fast / links / duplicate) ->
 * rate limit.
 *
 * Thresholds come from the admin-tunable config (Settings table), picked by
 * `surface` and tightened while an account is in probation. Mods/admins are
 * exempt from onboarding and the content/probation heuristics (still rate-limited).
 * `recentActivity` is supplied by the caller so the count + last-body lookup run
 * against the right table (comments vs. posts). `content` carries the body and a
 * client submit timestamp for the timing/link/duplicate checks.
 */
export async function guardCommunityPost(
    recentActivity: (userId: string) => Promise<RecentActivity>,
    opts?: { cooldownMs?: number; hourlyCap?: number; surface?: 'post' | 'thread' },
    content?: { body?: string; submittedAtMs?: number | null },
): Promise<GuardResult> {
    const surface = opts?.surface ?? 'post'
    const cfg = await getAntiSpamConfig()
    const session = await auth()
    if (!session?.user?.id) {
        return { ok: false, reason: 'signin', error: 'Please sign in to post.' }
    }
    const userId = session.user.id
    const authorName = session.user.username ?? session.user.name ?? 'Member'
    const { ip, userAgent } = getClientMeta()
    const [user, blocked] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { banned: true, emailVerified: true, role: true, onboardedAt: true, createdAt: true },
        }),
        ip ? prisma.blockedIp.findUnique({ where: { ip } }) : Promise.resolve(null),
    ])
    if (!user || user.banned) {
        return { ok: false, reason: 'banned', error: 'Your account is not able to post.' }
    }
    if (!user.emailVerified) {
        return {
            ok: false,
            reason: 'unverified',
            error: 'Please verify your email before posting — check your inbox for the link.',
        }
    }
    const isMod = user.role === 'MODERATOR' || user.role === 'ADMIN'
    // Onboarding gate: members must read the welcome thread first. Mods/admins exempt.
    if (!isMod && !user.onboardedAt) {
        return {
            ok: false,
            reason: 'onboarding',
            error: 'Almost there — read the “Welcome to the forums” post in General → News, and posting unlocks across the site.',
        }
    }
    if (blocked) {
        return { ok: false, reason: 'blocked', error: 'Unable to post from this connection.' }
    }
    // Trust state: new accounts (and only members) sit in probation — tighter
    // hourly cap and a stricter link allowance.
    const isProbation = !isMod && accountAgeMs(user.createdAt) < cfg.probationMs
    const cooldownMs =
        opts?.cooldownMs ?? (surface === 'thread' ? cfg.threadCooldownMs : cfg.postCooldownMs)
    let hourlyCap =
        opts?.hourlyCap ?? (surface === 'thread' ? cfg.threadHourly : cfg.postHourly)
    if (isProbation) hourlyCap = Math.min(hourlyCap, cfg.probationHourly)
    const body = content?.body ?? ''
    const submittedAtMs = content?.submittedAtMs ?? null
    // Content heuristics (cheap, no DB) — skipped for mods/admins.
    if (!isMod) {
        // Too fast: a real person can't read the form and type a post in < minSubmitMs.
        if (submittedAtMs && Date.now() - submittedAtMs < cfg.minSubmitMs) {
            return { ok: false, reason: 'too_fast', error: 'That was a little quick — take a moment and try again.' }
        }
        // Link cap: 0 for probation by default, a few for trusted accounts.
        if (body) {
            const maxLinks = isProbation ? cfg.probationMaxLinks : cfg.trustedMaxLinks
            if (countLinks(body) > maxLinks) {
                return {
                    ok: false,
                    reason: 'links',
                    error: isProbation
                        ? 'New accounts can’t include links yet — post again once you’re established.'
                        : `Too many links — keep it to ${cfg.trustedMaxLinks} or fewer.`,
                }
            }
        }
    }
    const recent = await recentActivity(userId)
    if (recent.lastAt && Date.now() - recent.lastAt.getTime() < cooldownMs) {
        return { ok: false, reason: 'cooldown', error: "You're posting a little fast — give it a minute." }
    }
    if (recent.lastHourCount >= hourlyCap) {
        return { ok: false, reason: 'hourly', error: "You've hit the hourly limit. Try again later." }
    }
    // Near-duplicate of the user's own last post — classic bot repeat.
    if (!isMod && body && recent.lastBody && isNearDuplicate(body, recent.lastBody)) {
        return { ok: false, reason: 'duplicate', error: "That looks like your last post — try saying something new." }
    }
    return { ok: true, userId, authorName, ip, userAgent, isProbation }
}