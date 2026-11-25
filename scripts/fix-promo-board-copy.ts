// scripts/fix-promo-board-copy.ts
//
// One-off copy fix: corrects the misspelled word "vegane" -> "vegan" in any
// forum/category NAME or DESCRIPTION (e.g. the Vendor Deals board header that
// read "Exclusive to vegane eating. Must be a member to view"). This text is
// stored in the database — editable in Admin → Forums — so a code deploy can't
// change it; this script does.
//
//   npx tsx scripts/fix-promo-board-copy.ts            # dry run — prints matches, changes nothing
//   npx tsx scripts/fix-promo-board-copy.ts --apply    # actually write the fixes
//
// Point DATABASE_URL at prod to fix prod. Dry run first.
//
// Safe by design: it matches the WHOLE word "vegane" (\bvegane\b, any case), so
// it never rewrites the brand token "veganeating" (slugs/handles) — only the
// human copy that has the extra "e".

import { config } from "dotenv";
config({ path: ".env.local" }); // loaded first => takes precedence
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";

const APPLY = process.argv.slice(2).includes("--apply");

// Replace the standalone word "vegane" with "vegan", preserving leading case.
const RE = /\bvegane\b/g;
const fix = (s: string | null): string | null =>
    s == null ? s : s.replace(RE, "vegan").replace(/\bVegane\b/g, "Vegan").replace(/\bVEGANE\b/g, "VEGAN");

function changed(before: string | null, after: string | null) {
    return (before ?? "") !== (after ?? "");
}

async function main() {
    const [forums, categories] = await Promise.all([
        prisma.forum.findMany({ select: { id: true, slug: true, name: true, description: true } }),
        prisma.category.findMany({ select: { id: true, slug: true, name: true, description: true } }),
    ]);

    let hits = 0;

    for (const f of forums) {
        const name = fix(f.name);
        const description = fix(f.description);
        if (changed(f.name, name) || changed(f.description, description)) {
            hits++;
            console.log(`FORUM  /${f.slug}`);
            if (changed(f.name, name)) console.log(`   name:  "${f.name}"  ->  "${name}"`);
            if (changed(f.description, description)) console.log(`   desc:  "${f.description}"  ->  "${description}"`);
            if (APPLY) await prisma.forum.update({ where: { id: f.id }, data: { name: name!, description } });
        }
    }

    for (const c of categories) {
        const name = fix(c.name);
        const description = fix(c.description);
        if (changed(c.name, name) || changed(c.description, description)) {
            hits++;
            console.log(`CATEGORY  /${c.slug}`);
            if (changed(c.name, name)) console.log(`   name:  "${c.name}"  ->  "${name}"`);
            if (changed(c.description, description)) console.log(`   desc:  "${c.description}"  ->  "${description}"`);
            if (APPLY) await prisma.category.update({ where: { id: c.id }, data: { name: name!, description } });
        }
    }

    if (hits === 0) {
        console.log(`No "vegane" typo found in any forum/category name or description.`);
    } else if (APPLY) {
        console.log(`\nFixed ${hits} record(s).`);
    } else {
        console.log(`\nDry run — ${hits} record(s) would change. Re-run with --apply to write them.`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
