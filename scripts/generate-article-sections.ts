// scripts/generate-article-sections.ts
//
// PHASE 2 — section images for articles. For each article it:
//   1. finds section anchors in the body (numbered headings + short bold lines),
//   2. generates one image per anchor, using the article's existing hero as the
//      style reference (so the set is cohesive with Phase 1),
//   3. splices each image into the Tiptap body as a clean JSON node, immediately
//      after its anchor block,
//   4. saves the untouched original body to `bodyBackup` first (once) so the whole
//      thing is fully reversible.
//
// Body editing is a structured array splice — never string surgery. Idempotent:
// previously-inserted AI images (src contains "/ai/") are stripped before re-insert,
// so re-runs replace rather than duplicate.
//
//   npx tsx scripts/generate-article-sections.ts --dry            # preview anchors per article, no cost
//   npx tsx scripts/generate-article-sections.ts --limit 3        # do 3 as a test
//   npx tsx scripts/generate-article-sections.ts --yes            # full run
//   npx tsx scripts/generate-article-sections.ts --start 120      # resume from #120
//   npx tsx scripts/generate-article-sections.ts --force --yes    # rebuild from backup, regenerate all
//
// Flags:
//   --dry             list each article + the section titles that would get images; no API/DB
//   --include-hidden  also process hidden articles
//   --all-headings    treat EVERY heading as an anchor (default: numbered headings + bold lines only)
//   --limit N         process at most N articles this run
//   --start N         1-based resume position within the candidate list
//   --quality Q       low | medium | high   (default: medium)
//   --force           reset from bodyBackup and regenerate, even if already done
//   --yes             skip the confirmation prompt
//
// Requires in this shell: OPENAI_API_KEY, SPACES_*, and a DATABASE_URL pointing at
// the DB you intend to write. Needs Article.bodyBackup + Article.sectionImages.
// Articles still on the placeholder hero are skipped (run the hero batch first).
// Add scripts/ to tsconfig "exclude".

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import * as readline from "node:readline";
import { prisma } from "../src/lib/prisma";
import { generateArticleImageSet, MAX_SECTIONS } from "../src/lib/article-image-pipeline";
import type { ImageQuality } from "../src/lib/openai-images";

const ROUGH_USD_PER_IMAGE = 0.08;
const PLACEHOLDER = "vegan-eating-blog"; // articles still on this hero are skipped
const NUMBERED = /^\s*\d+\s*[.)\-:]/; // "1." / "2)" / "3 -" …

// ---- flag helpers -----------------------------------------------------------
function hasFlag(n: string) {
    return process.argv.includes(`--${n}`);
}
function getOpt(n: string) {
    const i = process.argv.indexOf(`--${n}`);
    return i >= 0 ? process.argv[i + 1] : undefined;
}
function maskDb(url?: string) {
    return url ? url.replace(/:\/\/[^@]*@/, "://***@") : "(unset)";
}
async function confirm(q: string) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise<boolean>((res) => rl.question(q, (a) => { rl.close(); res(/^y(es)?$/i.test(a.trim())); }));
}

// ---- tiptap helpers (self-contained; mirror the pipeline's detection) -------
function textOf(node: any): string {
    if (!node) return "";
    if (node.type === "text") return node.text || "";
    if (Array.isArray(node.content)) return node.content.map(textOf).join("");
    return "";
}
function isAllBold(node: any): boolean {
    if (!Array.isArray(node?.content) || node.content.length === 0) return false;
    const texts = node.content.filter((c: any) => c?.type === "text" && (c.text || "").trim());
    if (texts.length === 0) return false;
    return texts.every((c: any) => Array.isArray(c.marks) && c.marks.some((m: any) => m?.type === "bold"));
}
function clean(t: string): string {
    return t.replace(/^\s*\d+\s*[.)\-:]\s*/, "").trim();
}
function parseArr(s: string | null): string[] {
    try {
        const v = JSON.parse(s || "[]");
        return Array.isArray(v) ? v : [];
    } catch {
        return [];
    }
}
function hasRealHero(img: string | null): boolean {
    return !!(img && img.trim()) && !img.toLowerCase().includes(PLACEHOLDER);
}

/** Top-level anchors that should get a section image, in document order. */
function sectionAnchors(doc: any, allHeadings: boolean): { index: number; title: string }[] {
    const content = Array.isArray(doc?.content) ? doc.content : [];
    const out: { index: number; title: string }[] = [];
    for (let i = 0; i < content.length; i++) {
        const n = content[i];
        if (n?.type === "heading") {
            const raw = textOf(n).trim();
            if (!raw) continue;
            if (allHeadings || NUMBERED.test(raw)) out.push({ index: i, title: clean(raw) });
        } else if (n?.type === "paragraph" && isAllBold(n)) {
            const raw = textOf(n).trim();
            if (raw && raw.length <= 120) out.push({ index: i, title: clean(raw) });
        }
    }
    return out;
}

/** Remove any previously-inserted AI image nodes (idempotency). */
function stripAiImages(doc: any): any {
    const content = (Array.isArray(doc?.content) ? doc.content : []).filter(
        (n: any) => !(n?.type === "image" && typeof n?.attrs?.src === "string" && n.attrs.src.includes("/ai/"))
    );
    return { ...doc, content };
}

function imageNode(src: string) {
    // Matches the public renderer (ArticleBody): reads attrs.src + attrs.align (full|left|right).
    return { type: "image", attrs: { src, align: "full" } };
}

/** Splice an image node after each anchor block. urls aligned to anchors; "" skipped. */
function insertAfterAnchors(doc: any, anchors: { index: number; title: string }[], urls: string[]): any {
    const after = new Map<number, string>();
    anchors.forEach((a, i) => {
        if (urls[i]) after.set(a.index, urls[i]);
    });
    const out: any[] = [];
    (Array.isArray(doc?.content) ? doc.content : []).forEach((n: any, i: number) => {
        out.push(n);
        if (after.has(i)) out.push(imageNode(after.get(i)!));
    });
    return { ...doc, content: out };
}

async function main() {
    const dry = hasFlag("dry");
    const force = hasFlag("force");
    const yes = hasFlag("yes");
    const includeHidden = hasFlag("include-hidden");
    const allHeadings = hasFlag("all-headings");

    const start = Math.max(1, parseInt(getOpt("start") || "1", 10) || 1);
    const limitRaw = parseInt(getOpt("limit") || "0", 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : Infinity;

    const qRaw = (getOpt("quality") || "medium").toLowerCase();
    const quality = (["low", "medium", "high"].includes(qRaw) ? qRaw : "medium") as ImageQuality;

    if (!dry && !process.env.OPENAI_API_KEY) {
        console.error("OPENAI_API_KEY is not set in this shell. Aborting (use --dry to preview).");
        process.exit(1);
    }

    const rows = await prisma.article.findMany({
        where: includeHidden ? {} : { hidden: false },
        orderBy: { id: "asc" },
        select: { id: true, slug: true, title: true, image: true, body: true, bodyBackup: true, sectionImages: true },
    });

    type Candidate = {
        row: (typeof rows)[number];
        doc: any;
        anchors: { index: number; title: string }[];
    };

    const candidates: Candidate[] = [];
    let skippedNoHero = 0;
    let skippedDone = 0;
    let skippedNoAnchors = 0;

    for (const row of rows) {
        if (!hasRealHero(row.image)) {
            skippedNoHero++;
            continue;
        }
        const alreadyDone = parseArr(row.sectionImages).length > 0;
        if (alreadyDone && !force) {
            skippedDone++;
            continue;
        }

        // Base = the untouched original (backup if we have one), cleaned of any AI images.
        const hadBackup = !!(row.bodyBackup && row.bodyBackup.trim());
        let doc: any;
        try {
            doc = JSON.parse((hadBackup ? row.bodyBackup : row.body) || "{}");
        } catch {
            skippedNoAnchors++;
            continue;
        }
        doc = stripAiImages(doc);

        const anchors = sectionAnchors(doc, allHeadings).slice(0, MAX_SECTIONS);
        if (anchors.length === 0) {
            skippedNoAnchors++;
            continue;
        }
        candidates.push({ row, doc, anchors });
    }

    const totalCandidates = candidates.length;
    let run = candidates.slice(start - 1);
    if (run.length > limit) run = run.slice(0, limit);

    const imagesThisRun = run.reduce((n, c) => n + c.anchors.length, 0);
    const estCost = (imagesThisRun * ROUGH_USD_PER_IMAGE).toFixed(2);

    console.log(`\nArticle section images (Phase 2)`);
    console.log(`  quality:        ${quality}`);
    console.log(`  anchors:        ${allHeadings ? "all headings + bold lines" : "numbered headings + bold lines"}`);
    console.log(`  scope:          ${includeHidden ? "ALL articles (incl. hidden)" : "visible articles only"}`);
    console.log(`  mode:           ${force ? "force (rebuild from backup, regenerate)" : "only articles not yet done"}`);
    console.log(`  candidates:     ${totalCandidates}`);
    console.log(`  this run:       ${run.length} article(s), ${imagesThisRun} image(s)  (start=${start}${limit !== Infinity ? `, limit=${limit}` : ""})`);
    console.log(`  est. cost:      ~$${estCost}  (@ $${ROUGH_USD_PER_IMAGE}/image)`);
    console.log(`  skipped:        ${skippedNoHero} no-hero, ${skippedDone} already-done, ${skippedNoAnchors} no-anchors`);
    console.log(`  DB target:      ${maskDb(process.env.DATABASE_URL)}\n`);

    if (run.length === 0) {
        console.log("Nothing to do.");
        await prisma.$disconnect();
        return;
    }

    if (dry) {
        console.log("DRY RUN — would insert section images after these anchors:\n");
        run.forEach((c, i) => {
            console.log(`  ${start + i}. ${c.row.slug}  (${c.anchors.length})`);
            c.anchors.forEach((a) => console.log(`        • ${a.title}`));
        });
        await prisma.$disconnect();
        return;
    }

    if (!yes) {
        const ok = await confirm(`Generate ${imagesThisRun} section image(s) across ${run.length} article(s) for ~$${estCost}? [y/N] `);
        if (!ok) {
            console.log("Aborted.");
            await prisma.$disconnect();
            return;
        }
    }

    let okCount = 0;
    let failCount = 0;
    let imgOk = 0;
    let imgFail = 0;

    for (let i = 0; i < run.length; i++) {
        const { row, doc, anchors } = run[i];
        const n = start + i;
        process.stdout.write(`[${n}/${totalCandidates}] ${row.slug} (${anchors.length}) … `);
        try {
            const result = await generateArticleImageSet(
                { slug: row.slug, title: row.title, subtitles: anchors.map((a) => a.title) },
                { quality, referenceMode: "existing", existingImageUrl: row.image }
            );

            const urls = result.sectionUrls;
            const newDoc = insertAfterAnchors(doc, anchors, urls);
            const hadBackup = !!(row.bodyBackup && row.bodyBackup.trim());

            await prisma.article.update({
                where: { id: row.id },
                data: {
                    body: JSON.stringify(newDoc),
                    sectionImages: JSON.stringify(urls.filter(Boolean)),
                    // Save the true original ONCE; never overwrite an existing backup.
                    ...(hadBackup ? {} : { bodyBackup: row.body }),
                },
            });

            imgOk += result.sectionUrls.filter(Boolean).length;
            imgFail += result.failed;
            okCount++;
            console.log(`ok (${result.sectionUrls.filter(Boolean).length}/${anchors.length})`);
        } catch (err) {
            failCount++;
            console.log("FAILED");
            console.error(`   ${(err as Error)?.message ?? err}`);
        }
    }

    console.log(`\nDone. ${okCount} article(s) updated, ${failCount} failed.`);
    console.log(`Section images: ${imgOk} inserted, ${imgFail} failed within successful articles.`);
    if (failCount) console.log(`Re-run to retry — finished articles are skipped unless you pass --force.`);
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});