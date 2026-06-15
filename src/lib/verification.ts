// src/lib/verification.ts
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

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

/** Validate a token, mark the user verified, and burn the token. */
export async function consumeVerificationToken(token: string): Promise<VerifyResult> {
    const row = await prisma.emailVerificationToken.findUnique({ where: { token } })
    if (!row) return 'invalid'

    if (row.expiresAt < new Date()) {
        await prisma.emailVerificationToken.delete({ where: { token } })
        return 'expired'
    }

    await prisma.$transaction([
        prisma.user.update({ where: { id: row.userId }, data: { emailVerified: new Date() } }),
        prisma.emailVerificationToken.delete({ where: { token } }),
    ])
    return 'ok'
}