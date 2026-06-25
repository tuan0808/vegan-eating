// scripts/categorize-recipes.ts
//
// Bulk-assigns Recipe.category from the title for recipes that are still
// uncategorized (category === ""). Manual categories are NEVER overwritten.
//
// Usage:
//   npx tsx scripts/categorize-recipes.ts            # dry-run against local DATABASE_URL
//   npx tsx scripts/categorize-recipes.ts --prod     # dry-run against PROD_DATABASE_URL
//   npx tsx scripts/categorize-recipes.ts --prod --apply   # WRITE to prod
//
// 30-minutes is intentionally NOT stored — catFilter("30-minutes") already
// matches readyIn <= 30 dynamically, so it needs no category value.
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// --- tiny .env reader (standalone scripts don't get Next's env loading) ------
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch {
    /* no .env — rely on process.env */
  }
  return out;
}

// --- title rules. Order = precedence (first match wins). ---------------------
// Each pattern matches whole words, case-insensitively, against the title.
const RULES: { category: string; re: RegExp }[] = [
  { category: "salads-bowls", re: /\b(salads?|bowls?|slaw)\b/i },
  {
    // NB: "sweet" (matches "sweet potato") and "truffle" (matches savory truffle
    // pasta/risotto) are deliberately excluded — too many savory false positives.
    category: "desserts",
    re: /\b(desserts?|cakes?|cupcakes?|cookies?|brownies?|pies?|tarts?|puddings?|cheesecakes?|mousse|ice ?cream|sorbet|custard|fudge|cobbler|crumble|do(ugh)?nuts?|parfait|gelato)\b/i,
  },
  {
    category: "baking",
    re: /\b(breads?|loaf|loaves|muffins?|scones?|buns?|bagels?|focaccia|cornbread|flatbread|pita|naan|rolls?|biscuits?|crackers?|croissants?|brioche|baguette|ciabatta|pretzels?|dough)\b/i,
  },
];

function classify(title: string): string | null {
  for (const r of RULES) if (r.re.test(title)) return r.category;
  return null;
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
    const all = await prisma.recipe.findMany({
      select: { id: true, title: true, category: true, readyIn: true },
    });

    const alreadyCategorized = all.filter((r) => (r.category ?? "") !== "");
    const uncategorized = all.filter((r) => (r.category ?? "") === "");

    // Build assignments for uncategorized recipes only.
    const buckets: Record<string, { id: string; title: string }[]> = {};
    const stillNA: { id: string; title: string; readyIn: number | null }[] = [];
    for (const r of uncategorized) {
      const cat = classify(r.title);
      if (cat) (buckets[cat] ??= []).push({ id: r.id, title: r.title });
      else stillNA.push({ id: r.id, title: r.title, readyIn: r.readyIn });
    }

    // --- report ---
    console.log(`  total recipes ............ ${all.length}`);
    console.log(`  already categorized ...... ${alreadyCategorized.length} (left untouched)`);
    console.log(`  uncategorized scanned .... ${uncategorized.length}\n`);

    for (const { category } of RULES) {
      const rows = buckets[category] ?? [];
      console.log(`  → ${category.padEnd(13)} would assign ${rows.length}`);
      rows.slice(0, 6).forEach((r) => console.log(`        · ${r.title}`));
      if (rows.length > 6) console.log(`        … +${rows.length - 6} more`);
    }

    const sub30NA = stillNA.filter((r) => r.readyIn != null && r.readyIn <= 30).length;
    console.log(`\n  → remaining NA ........... ${stillNA.length}  (of those, ${sub30NA} are sub-30 so still show under Weeknight in 30)`);
    stillNA.slice(0, 8).forEach((r) => console.log(`        · ${r.title}`));
    if (stillNA.length > 8) console.log(`        … +${stillNA.length - 8} more`);

    if (!apply) {
      console.log(`\n  DRY-RUN — nothing written. Re-run with --apply to write.\n`);
      return;
    }

    // --- apply: one updateMany per category (only the ids we matched) ---
    let written = 0;
    for (const [category, rows] of Object.entries(buckets)) {
      if (!rows.length) continue;
      const res = await prisma.recipe.updateMany({
        where: { id: { in: rows.map((r) => r.id) }, category: "" },
        data: { category },
      });
      written += res.count;
      console.log(`  wrote ${res.count} → ${category}`);
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
