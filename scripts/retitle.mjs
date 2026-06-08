// scripts/retitle.mjs
// Normalise titles in the database:
//   - Recipes:  standalone "with" -> "&"
//   - Articles: standalone "and"  -> "&"
//
//   node scripts/retitle.mjs           # DRY RUN — shows changes, writes nothing
//   node scripts/retitle.mjs --apply   # actually updates the database
//
// Recommended: back up your db first ->  cp prisma/dev.db prisma/dev.db.bak

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

// Swap a whole word for "&" (leaves "within"/"sandwich"/etc. untouched) and
// tidy up any doubled spaces the swap creates.
const swap = (title, re) => title.replace(re, "&").replace(/\s{2,}/g, " ").trim();

async function retitleTable(model, label, re) {
  const rows = await model.findMany({ select: { id: true, title: true } });
  const changes = rows
    .map((r) => ({ id: r.id, from: r.title, to: swap(r.title, re) }))
    .filter((c) => c.from !== c.to);

  console.log(`\n${label} — ${changes.length} title(s) to change.`);
  for (const c of changes) console.log(`  "${c.from}"\n   -> "${c.to}"`);

  if (APPLY) {
    for (const c of changes) {
      await model.update({ where: { id: c.id }, data: { title: c.to } });
    }
  }
  return changes.length;
}

let total = 0;
total += await retitleTable(prisma.recipe, 'Recipes ("and" -> "&")', /\band\b/gi);
total += await retitleTable(prisma.article, 'Articles ("and" -> "&")', /\band\b/gi);

console.log(
  APPLY
    ? `\nApplied — ${total} title(s) updated.\n`
    : `\nDRY RUN — nothing was written. Re-run with --apply to commit these changes.\n`
);

await prisma.$disconnect();
