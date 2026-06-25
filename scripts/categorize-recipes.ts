// scripts/categorize-recipes.ts
//
// CLI twin of the admin "Bulk categorize" tool. Reads the SAME category config
// (Setting key "categories.config", falling back to DEFAULT_CATEGORIES) and the
// SAME scan logic (src/lib/categorize) so the two never drift.
//
// Usage:
//   npx tsx scripts/categorize-recipes.ts            # dry-run vs local DATABASE_URL
//   npx tsx scripts/categorize-recipes.ts --prod     # dry-run vs PROD_DATABASE_URL
//   npx tsx scripts/categorize-recipes.ts --prod --apply   # WRITE to prod
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CATEGORIES, scanRecipes, type Category } from "../src/lib/categorize";

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch {
    /* rely on process.env */
  }
  return out;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const useProd = args.has("--prod");

  const env = loadEnv();
  const url = useProd
    ? env.PROD_DATABASE_URL || process.env.PROD_DATABASE_URL
    : env.DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error(`Missing ${useProd ? "PROD_DATABASE_URL" : "DATABASE_URL"} in .env`);
    process.exit(1);
  }

  const host = url.replace(/^.*@/, "").replace(/[:/].*$/, "");
  console.log(`\n  target : ${useProd ? "PROD" : "local"}  (${host})`);
  console.log(`  mode   : ${apply ? "APPLY (writing)" : "DRY-RUN (no writes)"}\n`);

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    // Same config the admin UI edits.
    const setting = await prisma.setting.findUnique({ where: { key: "categories.config" } });
    let cats: Category[] = DEFAULT_CATEGORIES;
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length) cats = parsed as Category[];
      } catch { /* keep defaults */ }
    }
    console.log(`  config : ${setting ? "from DB" : "defaults"} (${cats.length} categories)\n`);

    const rows = await prisma.recipe.findMany({
      select: { id: true, title: true, recipeType: true, category: true, readyIn: true },
    });
    const scan = scanRecipes(rows, cats);

    console.log(`  total recipes ............ ${scan.total}`);
    console.log(`  already categorized ...... ${scan.alreadyCategorized} (left untouched)`);
    console.log(`  uncategorized scanned .... ${scan.total - scan.alreadyCategorized}\n`);
    for (const b of scan.buckets) {
      console.log(`  → ${b.slug.padEnd(13)} would assign ${b.titles.length}`);
      b.titles.slice(0, 6).forEach((t) => console.log(`        · ${t.title}`));
      if (b.titles.length > 6) console.log(`        … +${b.titles.length - 6} more`);
    }
    console.log(`\n  → remaining NA ........... ${scan.naCount}  (${scan.naSub30} sub-30, still show under Weeknight in 30)`);
    scan.naTitles.forEach((t) => console.log(`        · ${t}`));

    if (!apply) {
      console.log(`\n  DRY-RUN — nothing written. Re-run with --apply to write.\n`);
      return;
    }

    let written = 0;
    for (const b of scan.buckets) {
      if (!b.titles.length) continue;
      const res = await prisma.recipe.updateMany({
        where: { id: { in: b.titles.map((t) => t.id) }, category: "" },
        data: { category: b.slug },
      });
      written += res.count;
      console.log(`  wrote ${res.count} → ${b.slug}`);
    }
    console.log(`\n  DONE — ${written} recipes updated.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
