// scripts/convert-legacy-bodies.ts
//
// One-time migration. Converts legacy string-array article bodies into real
// Tiptap docs using the SAME code path the edit page uses on save
// (@/lib/article-body → parseBody → legacyToDoc), so the result is byte-identical
// to opening each article and clicking Save: short non-sentence lines become h2
// headings, and the gallery images are woven into the body.
//
// The original legacy body is saved to `legacyBody` first (once), so the whole
// migration is reversible. Does NOT touch `bodyBackup` (that belongs to the
// section-image script). Articles already in Tiptap form are skipped.
//
//   npx tsx scripts/convert-legacy-bodies.ts --dry            # counts + per-article heading tally, no writes
//   npx tsx scripts/convert-legacy-bodies.ts --limit 5        # convert 5 to eyeball
//   npx tsx scripts/convert-legacy-bodies.ts --yes            # convert all legacy articles
//   npx tsx scripts/convert-legacy-bodies.ts --start 600      # resume from #600
//
// Flags:
//   --dry             show what would convert (incl. headings detected); no writes
//   --include-hidden  also convert hidden articles (default: all articles)
//   --limit N         convert at most N this run
//   --start N         1-based resume position within the candidate list
//   --yes             skip the confirmation prompt
//
// Requires a DATABASE_URL pointing at the DB you intend to write, and Article.legacyBody.
// No OpenAI / Spaces needed — pure DB transform. Add scripts/ to tsconfig "exclude".

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import * as readline from "node:readline";
import { prisma } from "../src/lib/prisma";
import { parseBody, type TiptapDoc } from "../src/lib/article-body";

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
function parseArr(s: string | null): string[] {
    try {
        const v = JSON.parse(s || "[]");
        return Array.isArray(v) ? v.map(String) : [];
    } catch {
        return [];
    }
}
function isLegacyArray(raw: string | null): boolean {
    if (!raw) return false;
    try {
        return Array.isArray(JSON.parse(raw));
    } catch {
        return false;
    }
}
function summarize(doc: TiptapDoc): { h: number; p: number; img: number } {
    let h = 0, p = 0, img = 0;
    for (const n of doc.content ?? []) {
        if (n.type === "heading") h++;
        else if (n.type === "paragraph") p++;
        else if (n.type === "image") img++;
    }
    return { h, p, img };
}
async function confirm(q: string) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise<boolean>((res) => rl.question(q, (a) => { rl.close(); res(/^y(es)?$/i.test(a.trim())); }));
}

async function main() {
    const dry = hasFlag("dry");
    const yes = hasFlag("yes");
    const includeHidden = hasFlag("include-hidden");

    const start = Math.max(1, parseInt(getOpt("start") || "1", 10) || 1);
    const limitRaw = parseInt(getOpt("limit") || "0", 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : Infinity;

    const rows = await prisma.article.findMany({
        where: includeHidden ? {} : {},
        orderBy: { id: "asc" },
        select: { id: true, slug: true, body: true, gallery: true, legacyBody: true },
    });

    // Candidates = legacy string-array bodies only. Tiptap docs are already done.
    const legacy = rows.filter((r) => isLegacyArray(r.body));
    const totalCandidates = legacy.length;

    let run = legacy.slice(start - 1);
    if (run.length > limit) run = run.slice(0, limit);

    console.log(`\nConvert legacy bodies → Tiptap`);
    console.log(`  legacy candidates: ${totalCandidates}`);
    console.log(`  already Tiptap:    ${rows.length - totalCandidates}`);
    console.log(`  this run:          ${run.length}  (start=${start}${limit !== Infinity ? `, limit=${limit}` : ""})`);
    console.log(`  DB target:         ${maskDb(process.env.DATABASE_URL)}\n`);

    if (run.length === 0) {
        console.log("Nothing to convert.");
        await prisma.$disconnect();
        return;
    }

    if (dry) {
        console.log("DRY RUN — would convert (headings / paragraphs / images after conversion):\n");
        let totalH = 0;
        run.forEach((r, i) => {
            const doc = parseBody(r.body, parseArr(r.gallery));
            const s = summarize(doc);
            totalH += s.h;
            console.log(`  ${start + i}. ${r.slug}  →  ${s.h}h / ${s.p}p / ${s.img}img`);
        });
        console.log(`\n${totalH} headings would be created across ${run.length} article(s).`);
        console.log(`(Headings are what the section-image script anchors to — higher is better.)`);
        await prisma.$disconnect();
        return;
    }

    if (!yes) {
        const ok = await confirm(`Convert ${run.length} legacy article(s) to Tiptap? [y/N] `);
        if (!ok) {
            console.log("Aborted.");
            await prisma.$disconnect();
            return;
        }
    }

    let okCount = 0;
    let failCount = 0;

    for (let i = 0; i < run.length; i++) {
        const r = run[i];
        const n = start + i;
        process.stdout.write(`[${n}/${totalCandidates}] ${r.slug} … `);
        try {
            const doc = parseBody(r.body, parseArr(r.gallery));
            const s = summarize(doc);
            await prisma.article.update({
                where: { id: r.id },
                data: {
                    body: JSON.stringify(doc),
                    // Preserve the original legacy array once, for reversibility.
                    ...(r.legacyBody && r.legacyBody.trim() ? {} : { legacyBody: r.body }),
                },
            });
            okCount++;
            console.log(`ok (${s.h}h / ${s.p}p / ${s.img}img)`);
        } catch (err) {
            failCount++;
            console.log("FAILED");
            console.error(`   ${(err as Error)?.message ?? err}`);
        }
    }

    console.log(`\nDone. ${okCount} converted, ${failCount} failed.`);
    if (failCount) console.log(`Re-run to retry — already-converted articles are skipped automatically.`);
    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});