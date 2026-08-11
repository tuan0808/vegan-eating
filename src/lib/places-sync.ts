// src/lib/places-sync.ts
//
// The background drain: takes queued GeoCells, pulls them from Overpass, and
// upserts the results into Place. Shared by the seed script and the
// CRON_SECRET-guarded sync route, so the two can never drift.
import { prisma } from "@/lib/prisma";
import { cellBBox, cellsCovering, ensureCells, placeSetting, radiusBBox, upsertOsmPlace } from "@/lib/places";
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

// - cached:      every covering cell is warm & fresh; no Overpass call made.
// - fetched:     we ran the Overpass request and settled the cells from it.
// - in_progress: another request/poll is already fetching this area; we didn't
//                start a second call. The caller should tell the client to
//                retry shortly rather than accept an empty result as final.
// - error:       the fetch failed; cells stay pending so a later call retries.
export type AreaFetchStatus = "cached" | "fetched" | "in_progress" | "error";

export type AreaFetchResult = {
    status: AreaFetchStatus;
    created: number;
    updated: number;
    places: number; // created + updated
};

// In-process dedup of concurrent/retried fills for the same area. The client's
// "finding places…" poll re-hits searchNearby every couple of seconds; without
// this, each poll (and each overlapping visitor) would fire its own Overpass
// request for an area that's already being fetched. The beta app runs a single
// instance, so a module-level Map is enough; a multi-instance deploy would need
// a DB-level lock (e.g. a GeoCell "FETCHING" status with a timestamp).
const inFlightAreas = new Map<string, Promise<AreaFetchResult>>();

function areaKey(lat: number, lng: number, radiusKm: number): string {
    return `${lat.toFixed(2)},${lng.toFixed(2)}:${Math.round(radiusKm)}`;
}

/**
 * On-demand fill for a live search. Ensures the area around (lat,lng) within
 * radiusKm has been pulled from Overpass at least once and isn't stale, so the
 * "Vegan Food Near Me" tool returns real results *anywhere* — not just the
 * preseeded cities.
 *
 * Unlike drainCells (one Overpass request per 0.1deg cell, for background
 * warming), this issues a SINGLE bbox request covering the whole search radius
 * and settles every covering GeoCell from it. The cells are just the ledger of
 * "have we fetched here" + when — so a repeat search of a warm area returns
 * immediately without touching the network.
 *
 * Safe to call on every search. Never throws — a fetch failure resolves to
 * status "error" and leaves the cells pending for a later retry; callers
 * time-box it and fall back to whatever is already in the DB.
 */
export async function ensureAreaFetched(lat: number, lng: number, radiusKm: number): Promise<AreaFetchResult> {
    const none = (status: AreaFetchStatus): AreaFetchResult => ({ status, created: 0, updated: 0, places: 0 });
    const keys = cellsCovering(lat, lng, radiusKm);
    if (!keys.length) return none("cached");

    const key = areaKey(lat, lng, radiusKm);
    // Fast path for a client poll: this area is already being fetched, so don't
    // start a second Overpass call — just report it's still in progress.
    if (inFlightAreas.has(key)) return none("in_progress");

    const ttlDays = await placeSetting("places.cellTtlDays");
    const staleBefore = new Date(Date.now() - ttlDays * 864e5);

    const existing = await prisma.geoCell.findMany({
        where: { key: { in: keys } },
        select: { key: true, status: true, fetchedAt: true, attempts: true },
    });
    const known = new Map(existing.map((c) => [c.key, c]));

    // Do we still need data for any covering cell? Never-seen, still-queued,
    // retryable-error, or settled-but-stale all mean "fetch"; a fresh OK/EMPTY
    // means we already have this area.
    const needsFetch = keys.some((k) => {
        const c = known.get(k);
        if (!c) return true;
        if (c.status === "PENDING") return true;
        if (c.status === "ERROR") return c.attempts < MAX_ATTEMPTS;
        return !c.fetchedAt || c.fetchedAt < staleBefore; // OK | EMPTY
    });
    if (!needsFetch) return none("cached");

    // Re-check under the just-awaited reads (a poll may have raced in), then
    // register the promise synchronously so the next poll dedups against it.
    if (inFlightAreas.has(key)) return none("in_progress");
    const missing = keys.filter((k) => !known.has(k));
    const p = doAreaFetch(lat, lng, radiusKm, keys, missing).finally(() => inFlightAreas.delete(key));
    inFlightAreas.set(key, p);
    return p;
}

/** The actual Overpass fetch + upsert + cell-settle. Assumes it's the sole
 *  in-flight fetch for the area (ensureAreaFetched guarantees that). */
async function doAreaFetch(
    lat: number,
    lng: number,
    radiusKm: number,
    keys: string[],
    missing: string[],
): Promise<AreaFetchResult> {
    // Make sure every covering cell has a row so the settle-updateMany below hits
    // them all (createMany skips the ones that already exist).
    if (missing.length) {
        await prisma.geoCell.createMany({
            data: missing.map((key) => {
                const [cLat, cLng] = key.split(",").map(Number);
                return { key, lat: cLat, lng: cLng, status: "PENDING" };
            }),
            skipDuplicates: true,
        });
    }

    const bbox = radiusBBox(lat, lng, radiusKm);
    try {
        const elements = await fetchBBox(bbox);
        const mapped = mapElements(elements, hintForCell(lat, lng));

        let created = 0;
        let updated = 0;
        for (const place of mapped) {
            const outcome = await upsertOsmPlace(place);
            if (outcome === "created") created++;
            else updated++;
        }

        // One bbox request covered every cell in the radius, so settle them all
        // together. EMPTY when the whole area genuinely has nothing — that's a
        // real answer we cache, so we don't re-hit Overpass for a barren area.
        await prisma.geoCell.updateMany({
            where: { key: { in: keys } },
            data: { status: mapped.length ? "OK" : "EMPTY", fetchedAt: new Date(), attempts: 0, error: null },
        });

        return { status: "fetched", created, updated, places: created + updated };
    } catch (e) {
        // Bump attempts across the covering cells so a persistent Overpass
        // failure eventually backs off to ERROR instead of retrying forever.
        // Resolve (don't throw) so the caller can surface "still trying".
        const message = e instanceof Error ? e.message : String(e);
        await prisma.geoCell.updateMany({
            where: { key: { in: keys }, status: { not: "OK" } },
            data: { attempts: { increment: 1 }, error: message.slice(0, 500) },
        });
        console.error(`doAreaFetch failed for ${lat},${lng} r=${radiusKm}: ${message}`);
        return { status: "error", created: 0, updated: 0, places: 0 };
    }
}

/** How much work is outstanding — for the admin view and the sync route's response. */
export async function cellQueueStats() {
    const rows = await prisma.geoCell.groupBy({ by: ["status"], _count: { _all: true } });
    const stats: Record<string, number> = { PENDING: 0, OK: 0, EMPTY: 0, ERROR: 0 };
    for (const r of rows) stats[r.status] = r._count._all;
    return stats;
}
