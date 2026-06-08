// scripts/retitle-with.mjs
// Rewrite standalone "with" -> "&" in recipe titles.
//
//   node scripts/retitle-with.mjs           # DRY RUN — shows changes, writes nothing
//   node scripts/retitle-with.mjs --apply   # actually updates the database
//
// Recommended: back up your db first ->  cp prisma/dev.db prisma/dev.db.bak

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// \bwith\b only — leaves "within", "without", etc. untouched. Collapses any
// doubled spaces the swap might create.
function transform(title) {
  return title.replace(/\bwith\b/gi, "&").replace(/\s{2,}/g, " ").trim();
}

const all = await prisma.recipe.findMany({ select: { id: true, title: true } });

const changes = all
  .map((r) => ({ id: r.id, from: r.title, to: transform(r.title) }))
  .filter((c) => c.from !== c.to);

console.log(`\nFound ${changes.length} title(s) with a standalone "with".\n`);
for (const c of changes) console.log(`  "${c.from}"\n   -> "${c.to}"\n`);

if (!APPLY) {
  console.log('DRY RUN — nothing was written. Re-run with --apply to commit these changes.\n');
} else {
  let n = 0;
  for (const c of changes) {
    await prisma.recipe.update({ where: { id: c.id }, data: { title: c.to } });
    n++;
  }
  console.log(`Updated ${n} title(s).\n`);
}

await prisma.$disconnect();
