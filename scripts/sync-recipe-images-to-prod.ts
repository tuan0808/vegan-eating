// scripts/sync-recipe-images-to-prod.ts
//
// Copies the AI-image columns from your LOCAL database to your PRODUCTION
// database — no OpenAI calls, no re-spend. The image files are already in Spaces;
// this just makes prod's recipe rows point at them.
//
// It needs BOTH connection strings, passed as env vars so nothing is hardcoded:
//
//   LOCAL_DATABASE_URL="postgresql://...localhost:5432/veganeating" \
//   PROD_DATABASE_URL="postgresql://...your-do-managed-pg..." \
//   npx tsx scripts/sync-recipe-images-to-prod.ts --dry
//
// FLAGS:
//   --dry        show what would change, write nothing
//   --limit N    only sync the first N recipes
//   --yes        skip the confirmation prompt
//
// What it copies (per recipe, matched by slug):
//   - cookalong, stepImages   (the generated step photos) — always
//   - image, imageBackup      (only when the local hero is an AI one, i.e. path
//                              contains "/ai/", so it never clobbers an original
//                              hero you kept in "Match current photo" mode)
//
// Recipes that exist locally but not in prod are skipped. Re-running is safe
// (last-write-wins with the same values).

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import readline from "node:readline";
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const has = (n: string) => args.includes(`--${n}`);
const opt = (n: string, def: string) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const limit = parseInt(opt("limit", "0"), 10) || 0;
const dry = has("dry");
const yes = has("yes");

const LOCAL_URL = process.env.LOCAL_DATABASE_URL;
const PROD_URL = process.env.PROD_DATABASE_URL;

function confirmPrompt(msg: string): Promise<void> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`${msg} (y/N) `, (a) => {
            rl.close();
            if (a.trim().toLowerCase() === "y") resolve();
            else {
                console.log("Aborted.");
                process.exit(0);
            }
        });
    });
}

function hasAi(r: { cookalong: string | null; stepImages: string | null }): boolean {
    return (r.stepImages != null && r.stepImages !== "[]") || (r.cookalong || "").includes("/ai/");
}

async function main() {
    if (!LOCAL_URL || !PROD_URL) {
        console.error("Set both LOCAL_DATABASE_URL and PROD_DATABASE_URL in the environment.");
        process.exit(1);
    }
    if (LOCAL_URL === PROD_URL) {
        console.error("LOCAL_DATABASE_URL and PROD_DATABASE_URL are identical — refusing to run.");
        process.exit(1);
    }

    const local = new PrismaClient({ datasourceUrl: LOCAL_URL });
    const prod = new PrismaClient({ datasourceUrl: PROD_URL });

    try {
        const localRecipes = await local.recipe.findMany({
            select: {
                slug: true,
                image: true,
                imageBackup: true,
                cookalong: true,
                stepImages: true,
            },
            orderBy: { sort: "asc" },
        });

        const withAi = localRecipes.filter(hasAi);
        const work = limit > 0 ? withAi.slice(0, limit) : withAi;

        console.log(`\nLocal recipes with AI images: ${withAi.length}`);
        console.log(`Syncing this run: ${work.length}${limit ? ` (--limit ${limit})` : ""}\n`);

        if (work.length === 0) {
            console.log("Nothing to sync.");
            return;
        }
        if (dry) {
            work.forEach((r, i) => {
                const heroNote = (r.image || "").includes("/ai/") ? " + new hero" : "";
                console.log(`  [${i + 1}] ${r.slug}${heroNote}`);
            });
            console.log("\n--dry: nothing written to prod.");
            return;
        }
        if (!yes) await confirmPrompt(`Write ${work.length} recipe(s) to PRODUCTION?`);

        let updated = 0;
        let missing = 0;
        for (let i = 0; i < work.length; i++) {
            const r = work[i];
            // Only carry the hero over when it's an AI-generated one.
            const heroIsAi = (r.image || "").includes("/ai/");
            const data: Record<string, unknown> = {
                cookalong: r.cookalong ?? "[]",
                stepImages: r.stepImages ?? "[]",
            };
            if (heroIsAi) {
                data.image = r.image;
                data.imageBackup = r.imageBackup ?? null;
            }

            const res = await prod.recipe.updateMany({ where: { slug: r.slug }, data });
            if (res.count > 0) {
                updated++;
                console.log(`[${i + 1}/${work.length}] ${r.slug} ✓`);
            } else {
                missing++;
                console.log(`[${i + 1}/${work.length}] ${r.slug} — not found in prod, skipped`);
            }
        }

        console.log(`\nDone. ${updated} updated, ${missing} not found in prod.`);
    } finally {
        await local.$disconnect();
        await prod.$disconnect();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});