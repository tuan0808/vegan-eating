// src/lib/prune-unverified.ts
import { prisma } from "@/lib/prisma";

// An account that never verified its email is inert: auth.ts refuses a session
// while emailVerified is null, so it can't log in, post, or create any content.
// After this grace window it's an abandoned or bot signup, safe to delete — it
// only inflates the member count. Never touches staff (MEMBER role only), so an
// admin/mod can't be pruned even in the unlikely event theirs is unverified.
const DEFAULT_DAYS = Number(process.env.PRUNE_UNVERIFIED_DAYS) || 7;

export async function pruneUnverifiedMembers(
    days = DEFAULT_DAYS,
): Promise<{ deleted: number; cutoff: string; days: number }> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // deleteMany cascades the same relations user.delete does (there's nothing to
    // cascade in practice — unverified accounts can't create content).
    const res = await prisma.user.deleteMany({
        where: { emailVerified: null, role: "MEMBER", createdAt: { lt: cutoff } },
    });
    return { deleted: res.count, cutoff: cutoff.toISOString(), days };
}
