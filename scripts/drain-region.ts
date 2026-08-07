// Queue + drain every cell in a lat/lng box, pulling real places from
// OpenStreetMap. One-off backfill for a region the seed skipped. Durable and
// re-runnable: cell state persists and place upserts key on the OSM id.
//
//   OVERPASS_ENDPOINT=https://overpass-api.de/api/interpreter \
//   npx tsx scripts/drain-region.ts
//
// Default box is the South Florida coastal strip (Miami -> West Palm Beach).
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { cellKey, cellBBox, upsertOsmPlace, CELL_SIZE_DEG } from "../src/lib/places";
import { fetchBBox, mapElements } from "../src/lib/places-osm";
import { nearestSeedCity } from "../src/lib/places-seed-cities";

// South Florida: Cutler Bay/Kendall up past West Palm Beach, coast to the
// western suburbs. Overridable via env for reuse.
const BOX = {
    south: Number(process.env.BOX_S ?? 25.55),
    north: Number(process.env.BOX_N ?? 26.75),
    west: Number(process.env.BOX_W ?? -80.45),
    east: Number(process.env.BOX_E ?? -80.03),
};

function log(m: string) {
    process.stdout.write(`${m}\n`);
}

function hintFor(lat: number, lng: number) {
    const sc = nearestSeedCity(lat + 0.05, lng + 0.05);
    return sc ? { city: sc.name, region: sc.region, country: sc.country } : { region: "Florida", country: "us" };
}

async function drainOnce(): Promise<{ done: number; created: number; errors: number }> {
    const cells = await prisma.geoCell.findMany({
        where: {
            status: "PENDING",
            lat: { gte: BOX.south, lte: BOX.north },
            lng: { gte: BOX.west, lte: BOX.east },
        },
        orderBy: { key: "asc" },
    });

    let done = 0;
    let created = 0;
    let errors = 0;
    for (const cell of cells) {
        try {
            const elements = await fetchBBox(cellBBox(cell.key));
            const mapped = mapElements(elements, hintFor(cell.lat, cell.lng));
            for (const place of mapped) {
                if ((await upsertOsmPlace(place)) === "created") created++;
            }
            await prisma.geoCell.update({
                where: { key: cell.key },
                data: { status: mapped.length ? "OK" : "EMPTY", fetchedAt: new Date(), attempts: { increment: 1 } },
            });
            done++;
            log(`  ${cell.key}: ${mapped.length} places  (running new: ${created})`);
        } catch (e) {
            errors++;
            await prisma.geoCell.update({
                where: { key: cell.key },
                data: { status: "ERROR", attempts: { increment: 1 } },
            });
            log(`  ${cell.key}: ERROR ${(e as Error).message}`);
        }
    }
    return { done, created, errors };
}

async function main() {
    // --- queue the box (existing OK/EMPTY cells are left alone) ---
    const keys: string[] = [];
    const snap = (v: number) => Math.floor(v / CELL_SIZE_DEG) * CELL_SIZE_DEG;
    for (let y = snap(BOX.south); y <= BOX.north; y += CELL_SIZE_DEG) {
        for (let x = snap(BOX.west); x <= BOX.east; x += CELL_SIZE_DEG) {
            keys.push(cellKey(y, x));
        }
    }
    const uniq = [...new Set(keys)];
    await prisma.geoCell.createMany({
        data: uniq.map((k) => {
            const [la, ln] = k.split(",").map(Number);
            return { key: k, lat: la, lng: ln, status: "PENDING" };
        }),
        skipDuplicates: true,
    });
    log(`queued box: ${uniq.length} cells cover the region (new ones set PENDING)`);

    // --- drain, retrying transient Overpass errors up to twice ---
    let totalCreated = 0;
    for (let pass = 1; pass <= 3; pass++) {
        const { done, created, errors } = await drainOnce();
        totalCreated += created;
        log(`pass ${pass}: ${done} cells drained, ${created} new places, ${errors} errors`);
        if (errors === 0) break;
        // Reset this box's ERROR cells to PENDING for another go.
        await prisma.geoCell.updateMany({
            where: {
                status: "ERROR",
                lat: { gte: BOX.south, lte: BOX.north },
                lng: { gte: BOX.west, lte: BOX.east },
            },
            data: { status: "PENDING", attempts: 0 },
        });
    }

    const total = await prisma.place.count({
        where: { lat: { gte: BOX.south, lte: BOX.north }, lng: { gte: BOX.west, lte: BOX.east } },
    });
    log(`\ndone. ${totalCreated} new places this run · ${total} places now in the box.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
