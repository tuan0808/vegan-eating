// scripts/dedupe-vendor-threads.ts
//
// One-off cleanup for the duplicate vendor-promo forum threads created before
// the save round-trip bug was fixed (the editor kept re-posting rows that had
// no threadSlug, so every save made a fresh thread). This keeps the OLDEST
// thread per title on the Vendor Deals board, deletes the rest (posts cascade),
// and re-points each vendor's threadSlug at the survivor.
//
//   npx tsx scripts/dedupe-vendor-threads.ts            # dry run — prints the plan, changes nothing
//   npx tsx scripts/dedupe-vendor-threads.ts --apply    # actually delete + relink
//
// Run it against whichever DB you point DATABASE_URL at (use the prod URL to
// clean prod). Dry run first.

import { config } from "dotenv";
config({ path: ".env.local" }); // loaded first => takes precedence
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { getVendorConfig, saveVendorConfig } from "../src/lib/vendor-config";
import { parseBoard, threadTitle } from "../src/lib/vendor-threads";

const APPLY = process.argv.slice(2).includes("--apply");

async function main() {
    const cfg = await getVendorConfig();
    const board = parseBoard(cfg.dealsHref);
    if (!board) {
        console.error(`Can't find a /forum/<category>/<board> in dealsHref ("${cfg.dealsHref}"). Nothing to do.`);
        return;
    }

    const forum = await prisma.forum.findFirst({
        where: { slug: board.forumSlug, category: { slug: board.categorySlug } },
        select: { id: true },
    });
    if (!forum) {
        console.error(`Board /forum/${board.categorySlug}/${board.forumSlug} not found. Nothing to do.`);
        return;
    }

    // Only the auto-created promo threads — never touch hand-written discussion.
    const threads = await prisma.thread.findMany({
        where: { forumId: forum.id, tag: "Promo" },
        select: { id: true, title: true, slug: true, createdAt: true, _count: { select: { posts: true } } },
        orderBy: { createdAt: "asc" },
    });

    console.log(`Board: /forum/${board.categorySlug}/${board.forumSlug}`);
    console.log(`Promo threads found: ${threads.length}\n`);

    // Group by title; the first (oldest) in each group survives.
    const groups = new Map<string, typeof threads>();
    for (const t of threads) {
        const g = groups.get(t.title) ?? [];
        g.push(t);
        groups.set(t.title, g);
    }

    const keepSlugByTitle = new Map<string, string>();
    const slugToKept = new Map<string, string>(); // every thread slug -> its survivor's slug
    const deleteIds: string[] = [];

    for (const [title, g] of groups) {
        const [keep, ...dups] = g;
        keepSlugByTitle.set(title, keep.slug);
        for (const t of g) slugToKept.set(t.slug, keep.slug);
        console.log(`• "${title}"`);
        console.log(`    keep  ${keep.slug}  (${keep.createdAt.toISOString().slice(0, 10)}, ${keep._count.posts} post(s))`);
        for (const d of dups) {
            deleteIds.push(d.id);
            console.log(`    drop  ${d.slug}  (${d.createdAt.toISOString().slice(0, 10)})`);
        }
    }

    // Re-point each vendor at the survivor: prefer following its current slug,
    // else match by the title we'd generate for it.
    let relinked = 0;
    const vendors = cfg.vendors.map((v) => {
        let next = v.threadSlug;
        if (v.threadSlug && slugToKept.has(v.threadSlug)) next = slugToKept.get(v.threadSlug);
        else {
            const byTitle = keepSlugByTitle.get(threadTitle(v));
            if (byTitle) next = byTitle;
        }
        if (next && next !== v.threadSlug) relinked++;
        return next === v.threadSlug ? v : { ...v, threadSlug: next };
    });

    console.log(`\nPlan: delete ${deleteIds.length} duplicate thread(s), keep ${groups.size}, relink ${relinked} vendor(s).`);

    if (!APPLY) {
        console.log(`\nDry run — nothing changed. Re-run with --apply to execute.`);
        return;
    }

    if (deleteIds.length) {
        const { count } = await prisma.thread.deleteMany({ where: { id: { in: deleteIds } } });
        console.log(`Deleted ${count} thread(s) (posts cascaded).`);
    }
    await saveVendorConfig({ ...cfg, vendors });
    console.log(`Vendor config relinked and saved.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
