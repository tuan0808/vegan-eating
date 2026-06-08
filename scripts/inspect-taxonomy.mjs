// scripts/inspect-taxonomy.mjs
// Prints the distinct `courses` and `recipeType` values in your recipe data,
// plus what `readyIn` looks like — so the pill filters can be matched exactly.
//
//   node scripts/inspect-taxonomy.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rows = await prisma.recipe.findMany({ select: { courses: true, recipeType: true, readyIn: true } });

const courseCounts = {};
const typeCounts = {};
for (const r of rows) {
  let cs = [];
  try { cs = JSON.parse(r.courses || "[]"); } catch { cs = []; }
  for (const c of cs) courseCounts[c] = (courseCounts[c] || 0) + 1;
  if (r.recipeType) typeCounts[r.recipeType] = (typeCounts[r.recipeType] || 0) + 1;
}

const sorted = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);

console.log(`\n${rows.length} recipes scanned.\n`);
console.log("DISTINCT courses (count\tvalue):");
sorted(courseCounts).forEach(([k, n]) => console.log(`  ${n}\t${k}`));
console.log("\nDISTINCT recipeType (count\tvalue):");
sorted(typeCounts).forEach(([k, n]) => console.log(`  ${n}\t${k}`));

const sampleReadyIn = rows.find((r) => r.readyIn != null)?.readyIn;
console.log("\nreadyIn — sample values:", rows.slice(0, 6).map((r) => r.readyIn));
console.log("readyIn — typeof:", typeof sampleReadyIn);

await prisma.$disconnect();
