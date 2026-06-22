// scripts/generate-article-heroes.ts
//
// PHASE 1 — bulk hero images for articles. Generates a hero from each article's
// TITLE and sets it as article.image (old image -> imageBackup). Does NOT touch
// the article body at all — that's Phase 2 (safe section auto-insert).
//
// Unattended: run it once and walk away. Resume-safe.
//
//   npx tsx scripts/generate-article-heroes.ts --dry                 # preview, no cost
//   npx tsx scripts/generate-article-heroes.ts --limit 5             # do 5 as a test
//   npx tsx scripts/generate-article-heroes.ts --yes                 # full run, no prompt
//   npx tsx scripts/generate-article-heroes.ts --start 240           # resume from #240
//   npx tsx scripts/generate-article-heroes.ts --force --yes         # redo every article
//
// Flags:
//   --dry          show what would happen; no API calls, no DB writes
//   --limit N      process at most N articles this run
//   --start N      1-based resume position within the candidate list
//   --quality Q    low | medium | high   (default: medium)
//   --force        include articles that already have an image (re-generate)
//   --yes          skip the confirmation prompt
//
// Requires in this shell: OPENAI_API_KEY, SPACES_* (or dev disk fallback), and a
// DATABASE_URL pointing at the DB you intend to write. Needs Article.imageBackup
// (part of the article image schema delta). Add scripts/ to tsconfig "exclude".

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import * as readline from "node:readline";
import { prisma } from "../src/lib/prisma";
import { generateArticleImageSet } from "../src/lib/article-image-pipeline";
import type { ImageQuality } from "../src/lib/openai-images";

const ROUGH_USD_PER_IMAGE = 0.08; // mirrors the pipeline's rough estimate

function hasFlag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}
function getOpt(name: string): string | undefined {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
}
function maskDb(url: string | undefined): string {
    if (!url) return "(unset)";
    return url.replace(/:\/\/[^@]*@/, "://***@");
}
async function confirm(question: string): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((res) =>
        rl.question(question, (ans) => {
            rl.close();
            res(/^y(es)?$/i.test(ans.trim()));
        })
    );
}

async function main() {
    const dry = hasFlag("dry");
    const force = hasFlag("force");
    const yes = hasFlag("yes");

    const start = Math.max(1, parseInt(getOpt("start") || "1", 10) || 1);
    const limitRaw = parseInt(getOpt("limit") || "0", 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : Infinity;

    const qRaw = (getOpt("quality") || "medium").toLowerCase();
    const quality = (["low", "medium", "high"].includes(qRaw) ? qRaw : "medium") as ImageQuality;

    if (!dry && !process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not set in this shell. Aborting (use --dry to preview).");
        process.exit(1);
    }

    // Candidates: visible articles. By default only those without a hero yet.
    const all = await prisma.article.findMany({
        where: { hidden: false },
        orderBy: { id: "asc" },
        select: { id: true, slug: true, title: true, image: true },
    });

    let candidates = all.filter((a) => force || !(a.image && a.image.trim()));
    const totalCandidates = candidates.length;

    // Resume + limit apply to the candidate list (1-based start).
    candidates = candidates.slice(start - 1);
    if (candidates.length > limit) candidates = candidates.slice(0, limit);

    const estCost = (candidates.length * ROUGH_USD_PER_IMAGE).toFixed(2);

    console.log(`\nArticle hero batch (Phase 1)`);
    console.log(`  quality:     ${quality}`);
    console.log(`  mode:        ${force ? "force (re-generate all visible)" : "only articles without a hero"}`);
    console.log(`  candidates:  ${totalCandidates}`);
    console.log(`  this run:    ${candidates.length}  (start=${start}${limit !== Infinity ? `, limit=${limit}` : ""})`);
    console.log(`  est. cost:   ~$${estCost}  (rough, @ $${ROUGH_USD_PER_IMAGE}/image)`);
    console.log(`  DB target:   ${maskDb(process.env.DATABASE_URL)}\n`);

    if (candidates.length === 0) {
        console.log("Nothing to do.");
        await prisma.$disconnect();
        return;
    }

    if (dry) {
        console.log("DRY RUN — would generate a hero for:");
        candidates.forEach((a, i) =>
            console.log(`  ${start + i}. ${a.slug}${a.image ? "   (replacing existing)" : ""}`)
        );
        await prisma.$disconnect();
        return;
    }

    if (!yes) {
        const ok = await confirm(`Generate ${candidates.length} hero(es) for ~$${estCost}? [y/N] `);
        if (!ok) {
            console.log("Aborted.");
            await prisma.$disconnect();
            return;
        }
    }

    let okCount = 0;
    let failCount = 0;

    for (let i = 0; i < candidates.length; i++) {
        const a = candidates[i];
        const n = start + i;
        process.stdout.write(`[${n}/${totalCandidates}] ${a.slug} … `);
        try {
            const result = await generateArticleImageSet(
                { slug: a.slug, title: a.title, subtitles: [] },
                { quality, referenceMode: "generate" }
            );
            if (!result.heroUrl) throw new Error("pipeline returned no hero url");

            await prisma.article.update({
                where: { id: a.id },
                data: { image: result.heroUrl, imageBackup: a.image || null },
            });

            okCount++;
            console.log("ok");
        } catch (err) {
            failCount++;
            console.log("FAILED");
            console.error(`   ${(err as Error)?.message ?? err}`);
        }
    }

    console.log(`\nDone. ${okCount} hero(es) set, ${failCount} failed.`);
    if (failCount) {
        console.log(`Some failed (transient API/network issues are common). Re-run to retry —`);
        console.log(`articles that now have a hero are skipped automatically unless you pass --force.`);
    }
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});