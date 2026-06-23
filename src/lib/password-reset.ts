// src/lib/password-reset.ts
// Single-use password-reset tokens — mirrors src/lib/verification.ts. The token
// is emailed, so holding it proves control of the inbox; that's the security
// layer that lets a logged-in user change their password (see settings/actions).
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TTL_MS = 60 * 60 * 1000; // 1 hour — reset links are deliberately short-lived

export type ResetStatus = "valid" | "invalid" | "expired";

/** Issue a fresh single-use reset token for a user (clears any previous one). */
export async function createPasswordResetToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.create({
        data: { userId, token, expiresAt: new Date(Date.now() + TTL_MS) },
    });
    return token;
}

/** Look at a token without burning it — used to gate the reset form on GET.
 *  Returns the owning userId when valid. Expired tokens are reaped here. */
export async function peekPasswordResetToken(
    token: string,
): Promise<{ status: ResetStatus; userId?: string }> {
    const row = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!row) return { status: "invalid" };
    if (row.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({ where: { token } });
        return { status: "expired" };
    }
    return { status: "valid", userId: row.userId };
}

/** Set a new password hash and burn the token, atomically. Re-validates inside
 *  the same call so a token can't be replayed between peek and consume. */
export async function consumePasswordResetToken(
    token: string,
    passwordHash: string,
): Promise<ResetStatus> {
    const row = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!row) return "invalid";
    if (row.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({ where: { token } });
        return "expired";
    }
    await prisma.$transaction([
        prisma.user.update({ where: { id: row.userId }, data: { password: passwordHash } }),
        prisma.passwordResetToken.delete({ where: { token } }),
    ]);
    return "valid";
}
