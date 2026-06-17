// scripts/load.ts
//
// PASS 3 of 3 — run AFTER flipping prisma provider to "postgresql" and running
// `npx prisma db push` against the empty Managed Postgres DB.
// Reads ./_dump/*.json + ./_dump/image-map.json, inserts every row in
// FK-dependency order, rewriting any local image path to its Spaces CDN URL.
//
//   DATABASE_URL="postgresql://...?sslmode=require" npx tsx scripts/load.ts
//
// Safe to read-only verify after; NOT idempotent — run against an empty DB.

import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const OUT = path.resolve("_dump");

// --- image rewrite (old path -> CDN URL), applied as a global text replace ---
let rewriteRe: RegExp | null = null;
let rewriteMap: Record<string, string> = {};
function escapeRe(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// NOTE: we intentionally do NOT revive ISO strings into Date objects. Prisma
// accepts ISO-8601 strings directly for DateTime columns, and reviving blindly
// would corrupt String columns that legitimately hold an ISO timestamp — e.g.
// the Setting row `maintenance_ends_at`, whose `value` is a String, not a Date.

// Load a table file, rewrite image paths across the whole text in one pass
// (catches galleries, avatars, and images embedded inside Tiptap JSON bodies),
// then parse. Prisma coerces ISO date strings into DateTime on insert.
async function loadTable(name: string): Promise<any[]> {
    let raw: string;
    try {
        raw = await readFile(path.join(OUT, `${name}.json`), "utf8");
    } catch {
        return [];
    }
    const rewritten = rewriteRe ? raw.replace(rewriteRe, (m) => rewriteMap[m] ?? m) : raw;
    return JSON.parse(rewritten) as any[];
}

async function insertChunked(model: string, rows: any[], chunk = 1000) {
    for (let i = 0; i < rows.length; i += chunk) {
        // @ts-expect-error dynamic model access
        await prisma[model].createMany({ data: rows.slice(i, i + chunk) });
    }
    console.log(`loaded ${String(rows.length).padStart(6)}  ${model}`);
}

async function main() {
    // Build the rewrite regex from the image map (longest keys first so a path
    // never shadows a longer one that contains it).
    try {
        rewriteMap = JSON.parse(await readFile(path.join(OUT, "image-map.json"), "utf8"));
        const keys = Object.keys(rewriteMap).sort((a, b) => b.length - a.length).map(escapeRe);
        rewriteRe = keys.length ? new RegExp(keys.join("|"), "g") : null;
        console.log(`image-map: ${Object.keys(rewriteMap).length} keys`);
    } catch {
        console.warn("No _dump/image-map.json found — loading without image rewrite.");
    }

    // ---- FK-dependency insertion order ----
    await insertChunked("user", await loadTable("user"));
    await insertChunked("recipe", await loadTable("recipe"));

    await insertChunked("article", await loadTable("article"));
    // Article.id is an autoincrement Int we inserted explicitly — advance the
    // sequence past the max id or the next real insert collides.
    await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"Article"','id'), GREATEST((SELECT COALESCE(MAX(id),0) FROM "Article"),1))`,
    );

    await insertChunked("category", await loadTable("category"));
    await insertChunked("forum", await loadTable("forum"));
    await insertChunked("thread", await loadTable("thread"));
    await insertChunked("post", await loadTable("post"));

    // Comment self-references parentId. Insert all with parentId nulled, then
    // set the real parents — sidesteps any parent-before-child ordering issue.
    const comments = await loadTable("comment");
    await insertChunked(
        "comment",
        comments.map((c) => ({ ...c, parentId: null })),
    );
    let reparented = 0;
    for (const c of comments) {
        if (c.parentId) {
            await prisma.comment.update({ where: { id: c.id }, data: { parentId: c.parentId } });
            reparented++;
        }
    }
    if (reparented) console.log(`reparented ${reparented} comment replies`);

    await insertChunked("setting", await loadTable("setting"));
    await insertChunked("blockedIp", await loadTable("blockedIp"));
    await insertChunked("emailVerificationToken", await loadTable("emailVerificationToken"));
    await insertChunked("itemView", await loadTable("itemView"));
    await insertChunked("recipeSubmission", await loadTable("recipeSubmission"));

    console.log("\nLoad complete.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());