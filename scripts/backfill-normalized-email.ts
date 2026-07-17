// scripts/backfill-normalized-email.ts
//
// One-time backfill for User.normalizedEmail (added for the Gmail dot/+tag defence).
// Sets the canonical inbox for every row that doesn't have one yet, so the signup
// uniqueness check protects EXISTING users' inboxes too — not just accounts created
// after the feature shipped. Idempotent: re-running only touches still-null rows.
//
//   Dev:   DATABASE_URL="postgresql://vegan:...@localhost:5432/..." npx tsx scripts/backfill-normalized-email.ts
//   Prod:  DATABASE_URL="$PROD_DATABASE_URL" npx tsx scripts/backfill-normalized-email.ts
//
// Reports any inbox that now maps to more than one account (a collision that predates
// the constraint) so you can review those before they matter.
import { PrismaClient } from "@prisma/client";
import { normalizeEmail } from "../src/lib/email-normalize";

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { normalizedEmail: null },
        select: { id: true, email: true },
    });
    console.log(`Backfilling ${users.length} user(s)…`);

    let updated = 0;
    for (const u of users) {
        await prisma.user.update({
            where: { id: u.id },
            data: { normalizedEmail: normalizeEmail(u.email) },
        });
        updated++;
    }
    console.log(`✓ Set normalizedEmail on ${updated} row(s).`);

    // Surface pre-existing collisions (same inbox, >1 account).
    const all = await prisma.user.findMany({ select: { username: true, email: true } });
    const byInbox = new Map<string, string[]>();
    for (const u of all) {
        const k = normalizeEmail(u.email);
        (byInbox.get(k) ?? byInbox.set(k, []).get(k)!).push(u.username);
    }
    const collisions = [...byInbox.entries()].filter(([, list]) => list.length > 1);
    if (collisions.length === 0) {
        console.log("No inbox maps to more than one account. ✓");
    } else {
        console.log(`\n⚠ ${collisions.length} inbox(es) shared by multiple accounts:`);
        for (const [inbox, list] of collisions) console.log(`  ${inbox} → ${list.join(", ")}`);
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
