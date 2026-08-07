// scripts/restore-places.ts
//
// Load a places snapshot produced by scripts/dump-places.ts, so a fresh clone
// gets the full dataset without re-running the Overpass seed.
//
//   npx tsx scripts/restore-places.ts             # add missing rows, keep existing
//   npx tsx scripts/restore-places.ts --replace   # wipe Place + GeoCell first
//   npx tsx scripts/restore-places.ts --in=/tmp/places.json.gz
//   npm run places:restore
//
// Default mode is additive: rows that collide on any unique constraint (id,
// slug, or osmType+osmId) are skipped, so it's safe to re-run and safe to run
// over a partially-seeded database.
//
// --replace deletes every Place, and Place cascades to PlaceReview. The script
// refuses to do that while reviews exist unless you also pass --force, because
// reviews are member-authored and are NOT in the snapshot — once deleted here
// they are gone.

import { config } from "dotenv";
config({ path: ".env.local" }); // loaded first => takes precedence
config({ path: ".env" });

import { gunzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import type { PlacesDump } from "./dump-places";

const args = process.argv.slice(2);
const REPLACE = args.includes("--replace");
const FORCE = args.includes("--force");
const inArg = args.find((a) => a.startsWith("--in="));
const IN = inArg ? path.resolve(inArg.slice("--in=".length)) : path.resolve("prisma/seed-data/places.json.gz");

async function insertChunked(
    model: "place" | "geoCell",
    rows: Record<string, unknown>[],
    chunk = 1000
): Promise<number> {
    let written = 0;
    for (let i = 0; i < rows.length; i += chunk) {
        const slice = rows.slice(i, i + chunk);
        // skipDuplicates makes this safe to re-run and safe over partial data.
        const res = await (prisma[model] as {
            createMany: (a: { data: unknown[]; skipDuplicates: boolean }) => Promise<{ count: number }>;
        }).createMany({ data: slice, skipDuplicates: true });
        written += res.count;
    }
    return written;
}

async function main() {
    let raw: Buffer;
    try {
        raw = await readFile(IN);
    } catch {
        console.error(`No snapshot at ${IN}\nRun \`npm run places:dump\` on a machine that has the data.`);
        process.exitCode = 1;
        return;
    }

    const dump = JSON.parse(gunzipSync(raw).toString("utf8")) as PlacesDump;
    if (dump.version !== 1) {
        console.error(`Unsupported snapshot version ${dump.version} — this script understands version 1.`);
        process.exitCode = 1;
        return;
    }

    console.log(`snapshot ${IN}`);
    console.log(`  taken ${dump.generatedAt}`);
    console.log(`  ${dump.counts.places} places, ${dump.counts.cells} cells\n`);

    if (REPLACE) {
        const reviews = await prisma.placeReview.count();
        if (reviews > 0 && !FORCE) {
            console.error(
                `Refusing --replace: ${reviews} PlaceReview row(s) exist and would be cascade-deleted.\n` +
                `Reviews are member-authored and are NOT in the snapshot. Re-run with --force if you\n` +
                `genuinely mean to discard them, or drop --replace to merge instead.`
            );
            process.exitCode = 1;
            return;
        }
        const p = await prisma.place.deleteMany({});
        const c = await prisma.geoCell.deleteMany({});
        console.log(`cleared ${p.count} places, ${c.count} cells${reviews ? ` (and ${reviews} reviews)` : ""}`);
    }

    // osmId went out as a string because JSON has no BigInt.
    const places = dump.places.map((p) => ({
        ...p,
        osmId: p.osmId === null || p.osmId === undefined ? null : BigInt(p.osmId as string),
    }));

    const wrotePlaces = await insertChunked("place", places);
    const wroteCells = await insertChunked("geoCell", dump.cells);

    const skippedPlaces = places.length - wrotePlaces;
    const skippedCells = dump.cells.length - wroteCells;

    console.log(`\nplaces: ${wrotePlaces} inserted${skippedPlaces ? `, ${skippedPlaces} already present` : ""}`);
    console.log(`cells:  ${wroteCells} inserted${skippedCells ? `, ${skippedCells} already present` : ""}`);
    console.log(`\ntotal now: ${await prisma.place.count()} places, ${await prisma.geoCell.count()} cells`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
