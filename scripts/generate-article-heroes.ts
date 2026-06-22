// scripts/generate-article-heroes.ts
//
// PHASE 1 — bulk hero images for articles. Generates a hero from each article's
// TITLE and sets it as article.image (previous REAL hero -> imageBackup). Does
// NOT touch the article body — that's Phase 2.
//
// Articles that currently show only the default placeholder image are treated as
// "needs a hero" (set PLACEHOLDER_MARKERS below). Articles that already have a
// real AI hero are skipped on a normal run, so the batch is resume-safe.
//
//   npx tsx scripts/generate-article-heroes.ts --list-images         # find your placeholder string
//   npx tsx scripts/generate-article-heroes.ts --dry                 # preview, no cost
//   npx tsx scripts/generate-article-heroes.ts --limit 5             # do 5 as a test
//   npx tsx scripts/generate-article-heroes.ts --yes                 # full run, no prompt
//   npx tsx scripts/generate-article-heroes.ts --start 240           # resume from #240
//   npx tsx scripts/generate-article-heroes.ts --force --yes         # redo EVERY article
//
// Flags:
//   --list-images  print distinct current image values + counts, then exit
//   --dry          show what would happen; no API calls, no DB writes
//   --include-hidden  also process hidden (unpublished) articles
//   --limit N      process at most N articles this run
//   --start N      1-based resume position within the candidate list
//   --quality Q    low | medium | high   (default: medium)
//   --force        process every visible article, even ones with a real hero
//   --yes          skip the confirmation prompt
//
// Requires in this shell: OPENAI_API_KEY, SPACES_* (or dev disk fallback), and a
// DATABASE_URL pointing at the DB you intend to write. Needs Article.imageBackup.
// Add scripts/ to tsconfig "exclude".

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import * as readline from "node:readline";
import { prisma } from "../src/lib/prisma";
import { generateArticleImageSet } from "../src/lib/article-image-pipeline";
import type { ImageQuality } from "../src/lib/openai-images";

const ROUGH_USD_PER_IMAGE = 0.08; // mirrors the pipeline's rough estimate

// ----------------------------------------------------------------------------
// SET THIS. Any article whose `image` contains one of these substrings is treated
// as "no real hero" and WILL be (re)generated on a normal run. Run with
// --list-images first to see your exact placeholder path, then paste a unique
// fragment of it here (e.g. "default-article", "vegan-eating-bg").
// ----------------------------------------------------------------------------
const PLACEHOLDER_MARKERS: string[] = [
    "vegan-eating-blog", // matches the default placeholder (vegan-eating-blog.jpg)
];

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
function isPlaceholder(img: string | null): boolean {
    if (!img || !img.trim()) return true;
    const s = img.toLowerCase();
    return PLACEHOLDER_MARKERS.some((m) => m && s.includes(m.toLowerCase()));
}
function isRealHero(img: string | null): boolean {
    return !!(img && img.trim()) && !isPlaceholder(img);
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
    const listImages = hasFlag("list-images");
    const dry = hasFlag("dry");
    const force = hasFlag("force");
    const yes = hasFlag("yes");
    const includeHidden = hasFlag("include-hidden");

    const start = Math.max(1, parseInt(getOpt("start") || "1", 10) || 1);
    const limitRaw = parseInt(getOpt("limit") || "0", 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : Infinity;

    const qRaw = (getOpt("quality") || "medium").toLowerCase();
    const quality = (["low", "medium", "high"].includes(qRaw) ? qRaw : "medium") as ImageQuality;

    const all = await prisma.article.findMany({
        where: includeHidden ? {} : { hidden: false },
        orderBy: { id: "asc" },
        select: { id: true, slug: true, title: true, image: true },
    });

    // --- discovery mode: just show what's in the image column ------------------
    if (listImages) {
        const counts = new Map<string, number>();
        for (const a of all) {
            const key = a.image?.trim() || "(empty)";
            counts.set(key, (counts.get(key) || 0) + 1);
        }
        console.log(`\nDistinct image values across ${all.length} visible article(s):\n`);
        Array.from(counts.entries())
            .sort((x, y) => y[1] - x[1])
            .slice(0, 30)
            .forEach(([k, c]) => console.log(`  ${String(c).padStart(5)}  ${k}`));
        console.log(`\nPaste a unique fragment of your placeholder into PLACEHOLDER_MARKERS.`);
        await prisma.$disconnect();
        return;
    }

    if (!dry && !process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not set in this shell. Aborting (use --dry to preview).");
        process.exit(1);
    }

    // Candidate = no real hero (missing or placeholder), unless --force does all.
    let candidates = all.filter((a) => force || !isRealHero(a.image));
    const totalCandidates = candidates.length;

    candidates = candidates.slice(start - 1);
    if (candidates.length > limit) candidates = candidates.slice(0, limit);

    const estCost = (candidates.length * ROUGH_USD_PER_IMAGE).toFixed(2);
    const placeholderCount = all.filter((a) => !isRealHero(a.image)).length;

    console.log(`\nArticle hero batch (Phase 1)`);
    console.log(`  quality:        ${quality}`);
    console.log(`  scope:          ${includeHidden ? "ALL articles (incl. hidden)" : "visible articles only"}`);
    console.log(`  mode:           ${force ? "force (every article in scope)" : "missing or placeholder hero only"}`);
    console.log(`  placeholder set:${PLACEHOLDER_MARKERS.length ? " " + PLACEHOLDER_MARKERS.join(", ") : " (none — only truly-empty images count as missing!)"}`);
    console.log(`  needs a hero:   ${placeholderCount}`);
    console.log(`  candidates:     ${totalCandidates}`);
    console.log(`  this run:       ${candidates.length}  (start=${start}${limit !== Infinity ? `, limit=${limit}` : ""})`);
    console.log(`  est. cost:      ~$${estCost}  (rough, @ $${ROUGH_USD_PER_IMAGE}/image)`);
    console.log(`  DB target:      ${maskDb(process.env.DATABASE_URL)}\n`);

    if (!force && PLACEHOLDER_MARKERS.length === 0 && placeholderCount === 0) {
        console.log("Every article has a non-empty image and no placeholder marker is set,");
        console.log("so nothing qualifies. Run --list-images, set PLACEHOLDER_MARKERS, or use --force.");
        await prisma.$disconnect();
        return;
    }

    if (candidates.length === 0) {
        console.log("Nothing to do.");
        await prisma.$disconnect();
        return;
    }

    if (dry) {
        console.log("DRY RUN — would generate a hero for:");
        candidates.forEach((a, i) =>
            console.log(`  ${start + i}. ${a.slug}${isRealHero(a.image) ? "   (replacing real hero)" : a.image ? "   (replacing placeholder)" : ""}`)
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
                // Only back up a REAL prior hero — never the placeholder.
                data: { image: result.heroUrl, imageBackup: isRealHero(a.image) ? a.image : null },
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
        console.log(`Transient API/network failures are common — just re-run; finished articles are skipped.`);
    }
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});