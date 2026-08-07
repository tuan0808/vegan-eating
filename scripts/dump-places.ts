// scripts/dump-places.ts
//
// Snapshot the OSM-derived place dataset to a gzipped JSON file so it can
// travel with the repo — re-seeding from Overpass takes ~12 minutes and 630
// requests against a shared public service, which is not something every
// machine and every fresh clone should be doing.
//
//   npx tsx scripts/dump-places.ts            # -> prisma/seed-data/places.json.gz
//   npx tsx scripts/dump-places.ts --out=/tmp/places.json.gz
//   npm run places:dump
//
// Restore with scripts/restore-places.ts.
//
// PRIVACY: this deliberately dumps Place and GeoCell ONLY. PlaceReview carries
// userId, ip and userAgent, and this file is committed — member reviews must
// never end up in git. If you add a model here, check it the same way first.

import { config } from "dotenv";
config({ path: ".env.local" }); // loaded first => takes precedence
config({ path: ".env" });

import { gzipSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

const DEFAULT_OUT = path.resolve("prisma/seed-data/places.json.gz");

const outArg = process.argv.slice(2).find((a) => a.startsWith("--out="));
const OUT = outArg ? path.resolve(outArg.slice("--out=".length)) : DEFAULT_OUT;

export type PlacesDump = {
    version: 1;
    generatedAt: string;
    counts: { places: number; cells: number };
    places: Record<string, unknown>[];
    cells: Record<string, unknown>[];
};

async function main() {
    const [places, cells] = await Promise.all([
        prisma.place.findMany({ orderBy: { slug: "asc" } }),
        prisma.geoCell.findMany({ orderBy: { key: "asc" } }),
    ]);

    // Place.osmId is a BigInt, which JSON.stringify throws on. Serialise as a
    // string; restore-places.ts converts it back.
    const serialisedPlaces = places.map((p) => ({
        ...p,
        osmId: p.osmId === null ? null : p.osmId.toString(),
    }));

    const dump: PlacesDump = {
        version: 1,
        generatedAt: new Date().toISOString(),
        counts: { places: places.length, cells: cells.length },
        places: serialisedPlaces,
        cells,
    };

    await mkdir(path.dirname(OUT), { recursive: true });
    const json = JSON.stringify(dump);
    const gz = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
    await writeFile(OUT, gz);

    const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;
    console.log(`places: ${places.length}`);
    console.log(`cells:  ${cells.length}`);
    console.log(`\nwrote ${OUT}`);
    console.log(`       ${mb(gz.length)} gzipped (${mb(Buffer.byteLength(json))} raw)`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
