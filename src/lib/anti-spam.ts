// src/lib/anti-spam.ts
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { getAntiSpamConfig } from '@/lib/antispam-config'

export type GuardReason = 'signin' | 'banned' | 'unverified' | 'blocked' | 'cooldown' | 'hourly'

export type GuardOk = {
    ok: true
    userId: string
    authorName: string
    ip: string | null
    userAgent: string | null
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

type RecentActivity = { lastAt: Date | null; lastHourCount: number }

/**
 * The single gate for every community write (comments, forum threads/posts).
 * Order: sign-in -> not banned -> email verified -> IP not blocklisted -> rate limit.
 *
 * Rate-limit thresholds come from the admin-tunable config (Settings table),
 * picked by `surface`. Explicit numeric opts still override if ever needed.
 * `recentActivity` is supplied by the caller so the count runs against the
 * right table (comments vs. posts).
 */
export async function guardCommunityPost(
    recentActivity: (userId: string) => Promise<RecentActivity>,
    opts?: { cooldownMs?: number; hourlyCap?: number; surface?: 'post' | 'thread' },
): Promise<GuardResult> {
    const surface = opts?.surface ?? 'post'
    const cfg = await getAntiSpamConfig()
    const cooldownMs =
        opts?.cooldownMs ?? (surface === 'thread' ? cfg.threadCooldownMs : cfg.postCooldownMs)
    const hourlyCap =
        opts?.hourlyCap ?? (surface === 'thread' ? cfg.threadHourly : cfg.postHourly)

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
            select: { banned: true, emailVerified: true },
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
    if (blocked) {
        return { ok: false, reason: 'blocked', error: 'Unable to post from this connection.' }
    }

    const { lastAt, lastHourCount } = await recentActivity(userId)
    if (lastAt && Date.now() - lastAt.getTime() < cooldownMs) {
        return { ok: false, reason: 'cooldown', error: "You're posting a little fast — give it a minute." }
    }
    if (lastHourCount >= hourlyCap) {
        return { ok: false, reason: 'hourly', error: "You've hit the hourly limit. Try again later." }
    }

    return { ok: true, userId, authorName, ip, userAgent }
}