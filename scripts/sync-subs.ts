// scripts/sync-subs.ts
//
// Copy the IngredientSub table from local -> prod so you don't re-run the
// OpenAI fill against production. Reads LOCAL_DATABASE_URL and
// PROD_DATABASE_URL from .env (same convention as your other sync scripts).
//
//   npx tsx scripts/sync-subs.ts --dry   # show row counts, write nothing
//   npx tsx scripts/sync-subs.ts         # upsert local rows into prod
//
// Aborts if the two URLs resolve to the same host, so rows can't land in the
// wrong database. Run after the deploy has pushed the schema to prod.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const SOURCE = process.env.LOCAL_DATABASE_URL;
const TARGET = process.env.PROD_DATABASE_URL;
const DRY = process.argv.includes("--dry");

function host(u?: string): string {
    try { return new URL(u || "").host || "(unknown)"; }
    catch { return "(unparseable)"; }
}

if (!SOURCE || !TARGET) {
    console.error("Set both LOCAL_DATABASE_URL and PROD_DATABASE_URL in .env. Aborting.");
    process.exit(1);
}

const src = new PrismaClient({ datasources: { db: { url: SOURCE } } });
const dst = new PrismaClient({ datasources: { db: { url: TARGET } } });

async function main() {
    console.log(`\n• Source (local): ${host(SOURCE)}`);
    console.log(`• Target (prod):  ${host(TARGET)}`);

    if (host(SOURCE) === host(TARGET)) {
        console.error("\nSource and target resolve to the same host — aborting to avoid a self-sync.");
        await Promise.all([src.$disconnect(), dst.$disconnect()]);
        process.exit(1);
    }

    const rows = await src.ingredientSub.findMany({
        select: { name: true, aliases: true, subs: true, vegan: true },
    });
    console.log(`\nRead ${rows.length} rows from source.`);

    if (DRY) {
        const have = await dst.ingredientSub.count();
        console.log(`Target currently has ${have} rows. DRY RUN — nothing written.`);
        await Promise.all([src.$disconnect(), dst.$disconnect()]);
        return;
    }

    let done = 0;
    for (const r of rows) {
        // columns are String (JSON text) — copy verbatim, no parse/stringify needed
        await dst.ingredientSub.upsert({
            where: { name: r.name },
            create: { name: r.name, aliases: r.aliases, subs: r.subs, vegan: r.vegan },
            update: { aliases: r.aliases, subs: r.subs, vegan: r.vegan },
        });
        if (++done % 100 === 0) console.log(`  ${done}/${rows.length}`);
    }

    console.log(`\nDone. Synced ${done} rows to ${host(TARGET)}.`);
    await Promise.all([src.$disconnect(), dst.$disconnect()]);
}

main().catch(async (e) => {
    console.error(e);
    await Promise.all([src.$disconnect(), dst.$disconnect()]);
    process.exit(1);
});