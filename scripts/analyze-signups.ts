// scripts/analyze-signups.ts
//
// READ-ONLY. Scores every member on the bot signals (random handle, Gmail dot/+tag
// trick, shared inbox, shared signup IP) and prints the flagged accounts + inbox/IP
// clusters, so you get a concrete verdict on the ~12 suspicious signups. Writes nothing.
//
//   Dev:   DATABASE_URL="postgresql://vegan:...@localhost:5432/..." npx tsx scripts/analyze-signups.ts
//   Prod:  DATABASE_URL="$PROD_DATABASE_URL" npx tsx scripts/analyze-signups.ts
import { PrismaClient } from "@prisma/client";
import { normalizeEmail, gmailDotCount } from "../src/lib/email-normalize";
import { scoreHandle } from "../src/lib/handle-entropy";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { username: true, name: true, email: true, createdAt: true, signupIp: true, banned: true, role: true },
        orderBy: { createdAt: "asc" },
    });

    const inbox = new Map<string, string[]>();
    const ip = new Map<string, string[]>();
    for (const u of users) {
        (inbox.get(normalizeEmail(u.email)) ?? inbox.set(normalizeEmail(u.email), []).get(normalizeEmail(u.email))!).push(u.username);
        if (u.signupIp) (ip.get(u.signupIp) ?? ip.set(u.signupIp, []).get(u.signupIp)!).push(u.username);
    }

    console.log(`\n=== ${users.length} total accounts ===\n`);

    const flagged: { u: (typeof users)[number]; score: number; signals: string[] }[] = [];
    for (const u of users) {
        if (u.role !== "MEMBER") continue;
        const signals: string[] = [];
        let score = 0;
        const un = scoreHandle(u.username);
        if (un.suspicious) { score += un.score; signals.push(`random username (${un.signals.join(", ")})`); }
        const nm = scoreHandle(u.name);
        if (nm.suspicious) { score += nm.score; signals.push(`random name (${nm.signals.join(", ")})`); }
        const dots = gmailDotCount(u.email);
        if (dots >= 3) { score += 2; signals.push(`${dots} gmail dots`); }
        if ((inbox.get(normalizeEmail(u.email))?.length ?? 0) > 1) { score += 4; signals.push("shared inbox"); }
        if (u.signupIp && (ip.get(u.signupIp)?.length ?? 0) > 1) { score += 4; signals.push("shared signup IP"); }
        if (score >= 4) flagged.push({ u, score, signals });
    }

    flagged.sort((a, b) => b.score - a.score);
    console.log(`--- ${flagged.length} flagged account(s) ---`);
    for (const { u, score, signals } of flagged) {
        console.log(`[${score}] @${u.username}${u.banned ? " (banned)" : ""} · ${u.email} · ${u.createdAt.toISOString().slice(0, 10)}`);
        console.log(`     ${signals.join(" | ")}`);
    }

    const sharedInbox = [...inbox.entries()].filter(([, l]) => l.length > 1);
    if (sharedInbox.length) {
        console.log(`\n--- ${sharedInbox.length} inbox(es) with multiple accounts ---`);
        for (const [k, l] of sharedInbox) console.log(`  ${k} → ${l.join(", ")}`);
    }
    const sharedIp = [...ip.entries()].filter(([, l]) => l.length > 1);
    if (sharedIp.length) {
        console.log(`\n--- ${sharedIp.length} IP(s) with multiple signups ---`);
        for (const [k, l] of sharedIp) console.log(`  ${k} → ${l.join(", ")}`);
    }
    console.log("");
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
