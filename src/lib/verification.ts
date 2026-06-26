// src/lib/verification.ts
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendWelcomeOnVerify } from '@/lib/welcome'

const TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/** Issue a fresh single-use token for a user (clears any previous one). */
export async function createVerificationToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('hex')
    await prisma.emailVerificationToken.deleteMany({ where: { userId } })
    await prisma.emailVerificationToken.create({
        data: { userId, token, expiresAt: new Date(Date.now() + TTL_MS) },
    })
    return token
}

export type VerifyResult = 'ok' | 'invalid' | 'expired'
export type VerifyOutcome = { status: VerifyResult; name?: string | null }

/** Validate a token, mark the user verified, and burn the token. Returns the
 *  member's display name on success (for the welcome screen). */
export async function consumeVerificationToken(token: string): Promise<VerifyOutcome> {
    const row = await prisma.emailVerificationToken.findUnique({ where: { token } })
    if (!row) return { status: 'invalid' }

    if (row.expiresAt < new Date()) {
        await prisma.emailVerificationToken.delete({ where: { token } })
        return { status: 'expired' }
    }

    const user = await prisma.user.findUnique({
        where: { id: row.userId },
        select: { name: true, username: true },
    })

    await prisma.$transaction([
        prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
        prisma.emailVerificationToken.delete({ where: { token } }),
    ])
    // Warm welcome email (honours admin enable/test-mode settings; never throws).
    await sendWelcomeOnVerify(row.userId)
    return { status: 'ok', name: user?.name ?? user?.username ?? null }
}