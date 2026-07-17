// src/lib/suspicious-accounts.ts
//
// Triage layer for the admin "Suspicious accounts" panel. Scores every member on
// the bot signals we've seen — machine-random handles, the Gmail dot/+tag trick,
// and accounts that share one inbox or one signup IP — and returns the flagged
// ones with human-readable reasons so an admin can bulk ban/delete with confidence.
//
// Clustering is computed live from the raw email (via normalizeEmail) rather than
// the stored normalizedEmail column, so detection works even before the backfill
// runs and for rows that predate the column.
import { prisma } from "@/lib/prisma";
import { normalizeEmail, gmailDotCount } from "@/lib/email-normalize";
import { scoreHandle } from "@/lib/handle-entropy";

export type SuspiciousAccount = {
    id: string;
    username: string;
    name: string | null;
    email: string;
    createdAt: Date;
    banned: boolean;
    signupIp: string | null;
    score: number;
    signals: string[];
    sharedInbox: boolean; // same underlying inbox as another account
    sharedIp: boolean; // same signup IP as another account
};

// Weights — a single weak signal (one random-looking handle) shouldn't flag an
// account on its own; shared inbox / shared IP are near-certain and weighted high.
const W = { handle: 1, gmailDots: 2, sharedInbox: 4, sharedIp: 4 } as const;
// A single weak coincidence (one 2-point handle signal) must NOT flag a real user;
// bots clear this easily (random username alone ≈ 5, or any shared inbox/IP = 4).
const FLAG_THRESHOLD = 4;

export async function getSuspiciousAccounts(limit = 200): Promise<SuspiciousAccount[]> {
    const users = await prisma.user.findMany({
        select: {
            id: true, username: true, name: true, email: true,
            createdAt: true, banned: true, signupIp: true, role: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
    });

    // Count how many accounts fall on each canonical inbox and each signup IP.
    const inboxCounts = new Map<string, number>();
    const ipCounts = new Map<string, number>();
    for (const u of users) {
        const inbox = normalizeEmail(u.email);
        inboxCounts.set(inbox, (inboxCounts.get(inbox) ?? 0) + 1);
        if (u.signupIp) ipCounts.set(u.signupIp, (ipCounts.get(u.signupIp) ?? 0) + 1);
    }

    const out: SuspiciousAccount[] = [];
    for (const u of users) {
        if (u.role === "ADMIN" || u.role === "MODERATOR") continue; // never flag staff

        const signals: string[] = [];
        let score = 0;

        const uname = scoreHandle(u.username);
        if (uname.suspicious) { score += W.handle * uname.score; signals.push(`random username (${uname.signals.join(", ")})`); }

        const nm = scoreHandle(u.name);
        if (nm.suspicious) { score += W.handle * nm.score; signals.push(`random display name (${nm.signals.join(", ")})`); }

        const dots = gmailDotCount(u.email);
        if (dots >= 3) { score += W.gmailDots; signals.push(`${dots} dots in gmail address`); }

        const inbox = normalizeEmail(u.email);
        const sharedInbox = (inboxCounts.get(inbox) ?? 0) > 1;
        if (sharedInbox) { score += W.sharedInbox; signals.push("shares one inbox with another account"); }

        const sharedIp = !!u.signupIp && (ipCounts.get(u.signupIp) ?? 0) > 1;
        if (sharedIp) { score += W.sharedIp; signals.push("shares signup IP with another account"); }

        if (score >= FLAG_THRESHOLD) {
            out.push({
                id: u.id, username: u.username, name: u.name, email: u.email,
                createdAt: u.createdAt, banned: u.banned, signupIp: u.signupIp,
                score, signals, sharedInbox, sharedIp,
            });
        }
    }

    return out
        .sort((a, b) => b.score - a.score || b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
}
