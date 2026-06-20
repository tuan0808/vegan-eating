// scripts/generate-recipe-images.ts
//
// Batch-generate AI images for the whole recipe library, then publish each set.
// Reuses the same pipeline + publish/merge logic as the per-recipe admin panel.
//
// RUN (from project root):
//   npx tsx scripts/generate-recipe-images.ts --dry                 # show the plan + cost, do nothing
//   npx tsx scripts/generate-recipe-images.ts --limit 3             # test on the first 3 eligible recipes
//   npx tsx scripts/generate-recipe-images.ts --yes                 # full run, no prompt
//
// FLAGS:
//   --dry            print the plan (count + rough cost) and exit
//   --limit N        only process the first N eligible recipes
//   --quality Q      low | medium | high   (default: medium)
//   --mode M         auto | existing | generate   (default: auto)
//                    auto = "match current photo" when the recipe has an image, else fresh hero
//   --force          also (re)process recipes that already have AI images
//   --yes            skip the confirmation prompt
//
// NOTES:
//   - This AUTO-PUBLISHES each set (no per-recipe review) — that's the point of a batch.
//     Individual recipes can still be regenerated/reviewed via the admin panel afterward.
//   - It runs against whatever environment your env vars point at. Local env => local DB +
//     public/ images. Production env (prod DATABASE_URL/DIRECT_URL + SPACES_* creds) => prod.
//   - Idempotent: recipes that already have AI images are skipped unless --force.
//   - One recipe at a time (steps within a recipe still run in parallel), so it paces itself.
//   - Requires dev deps: tsx (and dotenv). `npm i -D tsx dotenv` if missing.

import { config } from "dotenv";
config({ path: ".env.local" }); // loaded first => takes precedence
config({ path: ".env" });

import readline from "node:readline";
import { prisma } from "../src/lib/prisma";
import {
    generateRecipeImageSet,
    extractSteps,
    MAX_STEPS,
    type ReferenceMode,
} from "../src/lib/recipe-image-pipeline";
import type { ImageQuality } from "../src/lib/openai-images";

const ROUGH_USD_PER_IMAGE = 0.08;

// ---- args ----
const args = process.argv.slice(2);
const has = (n: string) => args.includes(`--${n}`);
const opt = (n: string, def: string) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const quality = opt("quality", "medium") as ImageQuality;
const limit = parseInt(opt("limit", "0"), 10) || 0;
const modeArg = opt("mode", "auto"); // auto | existing | generate
const force = has("force");
const yes = has("yes");
const dry = has("dry");

function pickMode(image: string | null): ReferenceMode {
    if (modeArg === "existing") return "existing";
    if (modeArg === "generate") return "generate";
    return image && image.trim() ? "existing" : "generate"; // auto
}

// Mirrors approvePendingImages: keep manual cook-along photos, drop prior AI
// entries (path contains "/ai/"), and assign generated photos only to steps
// without a manual photo already.
function mergeCookalong(existingJson: string | null | undefined, stepUrls: string[]): string {
    type Ca = { src: string; step: number | null };
    let existing: Ca[] = [];
    try {
        const v = JSON.parse(existingJson || "[]");
        if (Array.isArray(v)) {
            existing = v
                .filter((x: any) => x && typeof x.src === "string")
                .map((x: any) => ({ src: String(x.src), step: x.step == null ? null : Number(x.step) }));
        }
    } catch {
        /* ignore */
    }
    const manual = existing.filter((c) => !c.src.includes("/ai/"));
    const stepsWithManual = new Set(
        manual.filter((c) => c.step != null).map((c) => c.step as number)
    );
    const generated: Ca[] = stepUrls
        .map((src, i) => ({ src: src.trim(), step: i }))
        .filter((c) => c.src !== "" && !stepsWithManual.has(c.step as number));
    return JSON.stringify([...manual, ...generated]);
}

function confirmPrompt(): Promise<void> {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question("Proceed? (y/N) ", (a) => {
            rl.close();
            if (a.trim().toLowerCase() === "y") resolve();
            else {
                console.log("Aborted.");
                process.exit(0);
            }
        });
    });
}

async function main() {
    const all = await prisma.recipe.findMany({ orderBy: { sort: "asc" } });

    const eligible = all.filter((r) => {
        if (r.hidden) return false; // skip hidden / junk
        if (extractSteps(r.steps).length === 0) return false; // nothing to illustrate
        if (!force) {
            const hasAi =
                (r.stepImages && r.stepImages !== "[]") || (r.cookalong || "").includes("/ai/");
            if (hasAi) return false; // already done
        }
        return true;
    });

    const work = limit > 0 ? eligible.slice(0, limit) : eligible;

    // estimate
    let estImages = 0;
    for (const r of work) {
        const steps = Math.min(extractSteps(r.steps).length, MAX_STEPS);
        estImages += pickMode(r.image) === "existing" ? steps : steps + 1;
    }

    console.log(`\nRecipes eligible: ${eligible.length}${force ? " (--force: includes already-done)" : ""}`);
    console.log(`Recipes this run: ${work.length}${limit ? ` (--limit ${limit})` : ""}`);
    console.log(`Quality: ${quality} · Mode: ${modeArg}`);
    console.log(`Approx images: ${estImages}  (~$${(estImages * ROUGH_USD_PER_IMAGE).toFixed(2)} rough)\n`);

    if (dry) {
        work.forEach((r, i) =>
            console.log(`  [${i + 1}] ${r.slug}  (${pickMode(r.image)}, ${extractSteps(r.steps).length} steps)`)
        );
        console.log("\n--dry: nothing generated.");
        await prisma.$disconnect();
        return;
    }
    if (work.length === 0) {
        console.log("Nothing to do.");
        await prisma.$disconnect();
        return;
    }
    if (!yes) await confirmPrompt();

    let okCount = 0;
    let failCount = 0;
    let imgCount = 0;

    for (let idx = 0; idx < work.length; idx++) {
        const r = work[idx];
        const mode = pickMode(r.image);
        process.stdout.write(`[${idx + 1}/${work.length}] ${r.slug} (${mode}) `);
        try {
            const set = await generateRecipeImageSet(
                { slug: r.slug, title: r.title, ingredients: r.ingredients, steps: r.steps },
                {
                    quality,
                    referenceMode: mode,
                    existingImageUrl: r.image,
                    onProgress: () => process.stdout.write("."), // one dot per image
                }
            );

            await prisma.recipe.update({
                where: { slug: r.slug },
                data: {
                    // only touch the hero when we actually generated a new one
                    ...(set.heroUrl ? { imageBackup: r.image ?? null, image: set.heroUrl } : {}),
                    stepImages: JSON.stringify(set.stepUrls),
                    stepImagesPending: "[]",
                    imagePending: null,
                    cookalong: mergeCookalong(r.cookalong, set.stepUrls),
                },
            });

            imgCount += set.imagesGenerated;
            okCount++;
            console.log(` done (${set.imagesGenerated} imgs${set.failed ? `, ${set.failed} failed` : ""})`);
        } catch (e: any) {
            failCount++;
            console.log("");
            console.error(`   FAILED: ${e?.message || e}`);
        }
    }

    console.log(`\nFinished. ${okCount} recipe(s), ${imgCount} image(s), ${failCount} failure(s).`);
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
