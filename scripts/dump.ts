// scripts/dump.ts
//
// PASS 1 of 3 — run while prisma/schema.prisma provider = "sqlite".
// Reads every table out of dev.db and writes one JSON file per model to ./_dump.
// Pure read, no transforms — load.ts does the FK ordering and image rewriting.
//
//   DATABASE_URL="file:./prisma/dev.db" npx tsx scripts/dump.ts
//
// ⚠️  _dump/ contains user emails, hashed passwords and IPs. It is .gitignored
//     below and MUST be deleted once the migration is verified.

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const OUT = path.resolve("_dump");

// Dump order is irrelevant; load.ts controls insertion order.
const MODELS = [
    "user",
    "recipe",
    "article",
    "category",
    "forum",
    "thread",
    "post",
    "comment",
    "setting",
    "blockedIp",
    "emailVerificationToken",
    "itemView",
    "recipeSubmission",
] as const;

async function main() {
    await mkdir(OUT, { recursive: true });
    for (const m of MODELS) {
        // findMany returns scalar columns only (no relations) — exactly the shape createMany wants.
        // @ts-expect-error dynamic model access
        const rows = await prisma[m].findMany();
        await writeFile(path.join(OUT, `${m}.json`), JSON.stringify(rows));
        console.log(`dumped ${String(rows.length).padStart(6)}  ${m}`);
    }
    console.log("\nDump complete →", OUT);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());