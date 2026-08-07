// src/lib/places-sync.ts
//
// The background drain: takes queued GeoCells, pulls them from Overpass, and
// upserts the results into Place. Shared by the seed script and the
// CRON_SECRET-guarded sync route, so the two can never drift.
import { prisma } from "@/lib/prisma";
import { cellBBox, ensureCells, placeSetting, upsertOsmPlace } from "@/lib/places";
import { fetchBBox, mapElements, type LocalityHint } from "@/lib/places-osm";
import { nearestSeedCity, type SeedCity } from "@/lib/places-seed-cities";

const MAX_ATTEMPTS = 3;

export type DrainResult = {
    cells: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
};

/** Pre-warm every cell covering a seed city. Returns how many were queued. */
export async function queueCity(city: SeedCity): Promise<number> {
    return ensureCells(city.lat, city.lng, city.radiusKm);
}

/**
 * Locality for a cell, used to fill in city/region/country when a POI's own
 * addr:* tags are missing — which is the common case, since OSM POIs almost
 * never carry addr:country. Tags still win over this in mapElement().
 */
function hintForCell(lat: number, lng: number): LocalityHint {
    const city = nearestSeedCity(lat + 0.05, lng + 0.05); // cell centre
    return city ? { city: city.name, region: city.region, country: city.country } : {};
}

/**
 * Drain up to `limit` pending cells. Cells are processed one at a time — the
 * Overpass client serialises anyway, and doing it here keeps the per-cell
 * bookkeeping honest if the process is killed mid-run.
 */
export async function drainCells(
    limit?: number,
    onProgress?: (msg: string) => void
): Promise<DrainResult> {
    const take = limit ?? (await placeSetting("places.syncBatchSize"));
    const result: DrainResult = { cells: 0, created: 0, updated: 0, skipped: 0, errors: 0 };

    const cells = await prisma.geoCell.findMany({
        where: { status: "PENDING", attempts: { lt: MAX_ATTEMPTS } },
        orderBy: [{ attempts: "asc" }, { key: "asc" }],
        take,
    });

    for (const cell of cells) {
        result.cells++;
        const bbox = cellBBox(cell.key);
        try {
            const elements = await fetchBBox(bbox);
            const mapped = mapElements(elements, hintForCell(cell.lat, cell.lng));
            result.skipped += elements.length - mapped.length;

            for (const place of mapped) {
                // Overpass returns whatever intersects the bbox; a way's `center`
                // can land outside the cell we asked for. Keep it anyway — it's
                // real data — but it means cells aren't strictly disjoint, which
                // is fine because upserts are keyed on the OSM id.
                const outcome = await upsertOsmPlace(place);
                if (outcome === "created") result.created++;
                else result.updated++;
            }

            await prisma.geoCell.update({
                where: { key: cell.key },
                data: {
                    status: mapped.length ? "OK" : "EMPTY",
                    fetchedAt: new Date(),
                    count: mapped.length,
                    attempts: 0,
                    error: null,
                },
            });
            onProgress?.(`${cell.key}  ${mapped.length} places (${elements.length} raw)`);
        } catch (e) {
            result.errors++;
            const attempts = cell.attempts + 1;
            const message = e instanceof Error ? e.message : String(e);
            await prisma.geoCell.update({
                where: { key: cell.key },
                data: {
                    // Stay PENDING until we've burned the attempt budget, so a
                    // transient Overpass outage self-heals on the next run.
                    status: attempts >= MAX_ATTEMPTS ? "ERROR" : "PENDING",
                    attempts,
                    error: message.slice(0, 500),
                },
            });
            onProgress?.(`${cell.key}  FAILED (${attempts}/${MAX_ATTEMPTS}): ${message}`);
        }
    }

    return result;
}

/** How much work is outstanding — for the admin view and the sync route's response. */
export async function cellQueueStats() {
    const rows = await prisma.geoCell.groupBy({ by: ["status"], _count: { _all: true } });
    const stats: Record<string, number> = { PENDING: 0, OK: 0, EMPTY: 0, ERROR: 0 };
    for (const r of rows) stats[r.status] = r._count._all;
    return stats;
}
