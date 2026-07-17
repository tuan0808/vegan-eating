// scripts/purge-bots.ts
//
// Bans (or deletes) the bot cohort the analyzer flags. DRY-RUN by default — it only
// prints who it WOULD action until you pass --apply. Bans are reversible (safe first
// pass); --delete hard-removes (every User relation cascades, clean for bots).
// Staff (ADMIN/MODERATOR) are never touched.
//
//   Preview:      DATABASE_URL="$PROD_DATABASE_URL" npx tsx scripts/purge-bots.ts
//   Ban them:     DATABASE_URL="$PROD_DATABASE_URL" npx tsx scripts/purge-bots.ts --apply
//   Delete them:  DATABASE_URL="$PROD_DATABASE_URL" npx tsx scripts/purge-bots.ts --apply --delete
import { PrismaClient } from "@prisma/client";
import { normalizeEmail, gmailDotCount } from "../src/lib/email-normalize";
import { scoreHandle } from "../src/lib/handle-entropy";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const DELETE = process.argv.includes("--delete");
const THRESHOLD = 4;

async function main() {
    const users = await prisma.user.findMany({
        select: { id: true, username: true, name: true, email: true, signupIp: true, role: true, banned: true },
    });

    const inbox = new Map<string, number>();
    const ip = new Map<string, number>();
    for (const u of users) {
        const k = normalizeEmail(u.email);
        inbox.set(k, (inbox.get(k) ?? 0) + 1);
        if (u.signupIp) ip.set(u.signupIp, (ip.get(u.signupIp) ?? 0) + 1);
    }

    const flagged = users.filter((u) => {
        if (u.role !== "MEMBER") return false;
        let s = 0;
        if (scoreHandle(u.username).suspicious) s += scoreHandle(u.username).score;
        if (scoreHandle(u.name).suspicious) s += scoreHandle(u.name).score;
        if (gmailDotCount(u.email) >= 3) s += 2;
        if ((inbox.get(normalizeEmail(u.email)) ?? 0) > 1) s += 4;
        if (u.signupIp && (ip.get(u.signupIp) ?? 0) > 1) s += 4;
        return s >= THRESHOLD;
    });

    console.log(`${flagged.length} account(s) flagged (${DELETE ? "DELETE" : "BAN"} mode, ${APPLY ? "APPLY" : "DRY-RUN"}):`);
    for (const u of flagged) console.log(`  @${u.username}  ${u.email}${u.banned ? "  [already banned]" : ""}`);

    if (!APPLY) {
        console.log("\nDry-run only — re-run with --apply to execute.");
        return;
    }
    const ids = flagged.map((u) => u.id);
    if (!ids.length) return;
    if (DELETE) {
        const r = await prisma.user.deleteMany({ where: { id: { in: ids }, role: "MEMBER" } });
        console.log(`\n✓ Deleted ${r.count} account(s).`);
    } else {
        const r = await prisma.user.updateMany({ where: { id: { in: ids }, role: "MEMBER" }, data: { banned: true } });
        console.log(`\n✓ Banned ${r.count} account(s).`);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
