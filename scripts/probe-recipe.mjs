// scripts/probe-recipe.mjs
// Standalone diagnostic — run with: node scripts/probe-recipe.mjs
// Bypasses Next.js entirely (no .next, no running server), so a panic HERE
// proves the issue is the engine/schema and NOT a stale build or an
// unrestarted `next start`. A pass HERE + panic in the app = build/process.

import { PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Finally capture the versions that have been missing this whole thread.
function v(pkg) { try { return require(`${pkg}/package.json`).version; } catch { return "??"; } }
console.log("prisma CLI     :", v("prisma"));
console.log("@prisma/client :", v("@prisma/client"));

const prisma = new PrismaClient({ log: ["warn", "error"] });

async function step(label, fn) {
  try {
    const r = await fn();
    console.log(`OK   ${label} ->`, r);
  } catch (e) {
    console.error(`FAIL ${label}: ${e?.message ?? e}`);
  }
}

// Grab a real id to query by (your ids are string slugs, e.g. vegan-mille-feuille).
const first = await prisma.recipe.findFirst({ select: { id: true } });
const id = first?.id;
console.log("using id:", id);

// Baseline: this is what passed for you before.
await step("findFirst (full row)", () => prisma.recipe.findFirst());

// THE call your pages actually make, which the old probe never exercised:
await step("findUnique by id (bare)", () =>
  prisma.recipe.findUnique({ where: { id } })
);
await step("findUnique by id (+select id, gallery)", () =>
  prisma.recipe.findUnique({ where: { id }, select: { id: true, gallery: true } })
);

await prisma.$disconnect();
