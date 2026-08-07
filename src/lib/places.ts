// src/lib/places.ts
//
// The read + write side of the Place dataset. Everything user-facing goes
// through here and only ever touches our own Postgres — Overpass lives behind
// the background cell drain in src/lib/places-osm.ts.
//
// Geo queries run without PostGIS: a bounding-box prefilter uses the
// [lat, lng] index, then haversine sorts and trims to a true radius.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/recipe-filters";
import type { MappedPlace, PlaceCategory, PlaceType } from "@/lib/places-osm";
import { SEED_CITIES } from "@/lib/places-seed-cities";

// ---------------------------------------------------------------------------
// Tunables. Live in the Setting table so they change without a redeploy —
// same pattern as src/lib/veganize.ts.
// ---------------------------------------------------------------------------
const DEFAULTS = {
    "places.cellTtlDays": 30,
    "places.syncBatchSize": 20,
    "places.searchRadiusMaxKm": 50,
    "places.searchRadiusDefaultKm": 10,
    "places.submitDailyCap": 5,
    "places.cityMinPlaces": 5, // a city page needs this many before we publish it
};

export async function placeSetting(key: keyof typeof DEFAULTS): Promise<number> {
    if (process.env.NEXT_PHASE === "phase-production-build" || !process.env.DATABASE_URL) {
        return DEFAULTS[key];
    }
    const row = await prisma.setting.findUnique({ where: { key } });
    const n = row ? Number(row.value) : NaN;
    return Number.isFinite(n) ? n : DEFAULTS[key];
}

// ---------------------------------------------------------------------------
// Geo maths
// ---------------------------------------------------------------------------
const KM_PER_DEG_LAT = 111.32;
export const CELL_SIZE_DEG = 0.1; // ~11km

export type BBox = { south: number; west: number; north: number; east: number };

/** Degrees of longitude per km at this latitude. Guarded so the poles don't divide by ~0. */
function kmPerDegLng(lat: number): number {
    return Math.max(KM_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180), 1e-6);
}

/** The bounding box enclosing a radius around a point. May exceed ±180 lng; see lngRanges(). */
export function radiusBBox(lat: number, lng: number, radiusKm: number): BBox {
    const dLat = radiusKm / KM_PER_DEG_LAT;
    const dLng = radiusKm / kmPerDegLng(lat);
    return {
        south: Math.max(lat - dLat, -90),
        north: Math.min(lat + dLat, 90),
        west: lng - dLng,
        east: lng + dLng,
    };
}

/**
 * Longitude ranges for a bbox, split into two when it crosses the antimeridian.
 * Without this a search near ±180 silently returns nothing, because
 * `lng BETWEEN 179 AND 181` matches no rows.
 */
export function lngRanges(bbox: BBox): Array<[number, number]> {
    if (bbox.east - bbox.west >= 360) return [[-180, 180]];
    const wrap = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
    const w = wrap(bbox.west);
    const e = wrap(bbox.east);
    return w <= e ? [[w, e]] : [[w, 180], [-180, e]];
}

/** Great-circle distance in km. Mirrors the SQL below, for use on already-loaded rows. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ---------------------------------------------------------------------------
// Cells — the unit of Overpass ingestion
// ---------------------------------------------------------------------------
/** SW corner of the 0.1deg cell containing a point, as a stable string key. */
export function cellKey(lat: number, lng: number): string {
    const snap = (v: number) => (Math.floor(v / CELL_SIZE_DEG) * CELL_SIZE_DEG).toFixed(1);
    return `${snap(lat)},${snap(lng)}`;
}

export function cellBBox(key: string): BBox {
    const [lat, lng] = key.split(",").map(Number);
    return { south: lat, west: lng, north: lat + CELL_SIZE_DEG, east: lng + CELL_SIZE_DEG };
}

/** Every cell key touching the radius. Capped so a huge radius can't queue thousands. */
export function cellsCovering(lat: number, lng: number, radiusKm: number, max = 200): string[] {
    const b = radiusBBox(lat, lng, radiusKm);
    const keys: string[] = [];
    const step = CELL_SIZE_DEG;
    const snap = (v: number) => Math.floor(v / step) * step;

    outer: for (let y = snap(b.south); y <= b.north; y += step) {
        for (let x = snap(b.west); x <= b.east; x += step) {
            keys.push(cellKey(y, x));
            if (keys.length >= max) break outer;
        }
    }
    return [...new Set(keys)];
}

/**
 * Queue any cell covering this area that we've never fetched, or whose data has
 * gone stale. Never blocks the caller on Overpass — the sync route drains it.
 */
export async function ensureCells(lat: number, lng: number, radiusKm: number): Promise<number> {
    const keys = cellsCovering(lat, lng, radiusKm);
    if (!keys.length) return 0;

    const ttlDays = await placeSetting("places.cellTtlDays");
    const staleBefore = new Date(Date.now() - ttlDays * 864e5);

    const existing = await prisma.geoCell.findMany({
        where: { key: { in: keys } },
        select: { key: true, status: true, fetchedAt: true },
    });
    const known = new Map(existing.map((c) => [c.key, c]));

    const missing = keys.filter((k) => !known.has(k));
    if (missing.length) {
        await prisma.geoCell.createMany({
            data: missing.map((key) => {
                const [cLat, cLng] = key.split(",").map(Number);
                return { key, lat: cLat, lng: cLng, status: "PENDING" };
            }),
            skipDuplicates: true,
        });
    }

    // Re-queue anything settled but stale. PENDING rows are already in line, and
    // ERROR rows are left to the sync route's attempt cap.
    const stale = existing
        .filter((c) => (c.status === "OK" || c.status === "EMPTY") && (!c.fetchedAt || c.fetchedAt < staleBefore))
        .map((c) => c.key);
    if (stale.length) {
        await prisma.geoCell.updateMany({
            where: { key: { in: stale } },
            data: { status: "PENDING", attempts: 0 },
        });
    }

    return missing.length + stale.length;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export type NearbyPlace = {
    id: string;
    slug: string;
    name: string;
    category: PlaceCategory;
    type: PlaceType;
    lat: number;
    lng: number;
    address: string;
    city: string;
    citySlug: string;
    region: string;
    country: string;
    phone: string | null;
    website: string | null;
    openingHours: string | null;
    cuisines: string;
    wheelchair: string | null;
    images: string;
    ratingAvg: number;
    ratingCount: number;
    distanceKm: number;
};

export type NearQuery = {
    lat: number;
    lng: number;
    radiusKm?: number;
    category?: PlaceCategory[];
    type?: PlaceType[];
    limit?: number;
    offset?: number;
};

/**
 * Places within a radius, nearest first.
 *
 * Bounding box in the WHERE (so the [lat, lng] index does the work), haversine
 * in a wrapper so we can filter on the true circular radius — a bbox alone
 * over-selects by ~27% at the corners.
 */
export async function placesNear(q: NearQuery): Promise<{ places: NearbyPlace[]; hasMore: boolean }> {
    const maxRadius = await placeSetting("places.searchRadiusMaxKm");
    const radiusKm = Math.min(Math.max(q.radiusKm ?? (await placeSetting("places.searchRadiusDefaultKm")), 0.1), maxRadius);
    const limit = Math.min(Math.max(q.limit ?? 30, 1), 100);
    const offset = Math.max(q.offset ?? 0, 0);

    const bbox = radiusBBox(q.lat, q.lng, radiusKm);
    const ranges = lngRanges(bbox);

    const lngClause = Prisma.join(
        ranges.map(([w, e]) => Prisma.sql`("lng" BETWEEN ${w} AND ${e})`),
        " OR "
    );

    const filters: Prisma.Sql[] = [];
    if (q.category?.length) filters.push(Prisma.sql`AND "category" = ANY(${q.category})`);
    if (q.type?.length) filters.push(Prisma.sql`AND "type" = ANY(${q.type})`);

    // limit + 1 so we know whether another page exists without a second count query.
    const rows = await prisma.$queryRaw<NearbyPlace[]>`
        SELECT * FROM (
            SELECT
                "id", "slug", "name", "category", "type", "lat", "lng", "address",
                "city", "citySlug", "region", "country", "phone", "website",
                "openingHours", "cuisines", "wheelchair", "images",
                "ratingAvg", "ratingCount",
                6371 * 2 * asin(LEAST(1, sqrt(
                    power(sin(radians("lat" - ${q.lat}) / 2), 2) +
                    cos(radians(${q.lat})) * cos(radians("lat")) *
                    power(sin(radians("lng" - ${q.lng}) / 2), 2)
                ))) AS "distanceKm"
            FROM "Place"
            WHERE "status" = 'PUBLISHED'
              AND "lat" BETWEEN ${bbox.south} AND ${bbox.north}
              AND (${lngClause})
              ${filters.length ? Prisma.join(filters, " ") : Prisma.empty}
        ) t
        WHERE t."distanceKm" <= ${radiusKm}
        ORDER BY t."distanceKm" ASC, t."ratingCount" DESC, t."id" ASC
        LIMIT ${limit + 1} OFFSET ${offset}
    `;

    const hasMore = rows.length > limit;
    return { places: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

/** A published place by slug, with its approved reviews. */
export async function placeBySlug(slug: string) {
    return prisma.place.findFirst({
        where: { slug, status: "PUBLISHED" },
        include: {
            reviews: {
                where: { status: "APPROVED" },
                orderBy: { createdAt: "desc" },
                include: { user: { select: { username: true, name: true, avatarUrl: true } } },
            },
        },
    });
}

/**
 * Cities with enough published places to deserve a page. Drives
 * /vegan-restaurants/[country]/[city] and the sitemap — the minimum is what
 * keeps us out of Google's scaled-content-abuse territory.
 */
export async function publishedCities(): Promise<
    Array<{ citySlug: string; country: string; city: string; count: number }>
> {
    const min = await placeSetting("places.cityMinPlaces");
    const rows = await prisma.place.groupBy({
        by: ["citySlug", "country", "city"],
        where: { status: "PUBLISHED", citySlug: { not: "" }, country: { not: "" } },
        _count: { _all: true },
        orderBy: { _count: { citySlug: "desc" } },
    });
    return rows
        .filter((r) => r._count._all >= min)
        .map((r) => ({ citySlug: r.citySlug, country: r.country, city: r.city, count: r._count._all }));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------
// Latin letters NFD cannot decompose — they are distinct code points, not a base
// letter plus a combining mark. Without these, Danish/Norwegian, German and
// Polish names lose characters outright ("Brasserie Ø" -> "brasserie").
const TRANSLITERATE: Record<string, string> = {
    "\u00f8": "o",   // o-slash
    "\u00e6": "ae",  // ae ligature
    "\u0153": "oe",  // oe ligature
    "\u00df": "ss",  // eszett
    "\u0142": "l",   // l with stroke
    "\u0111": "d",   // d with stroke
    "\u00f0": "d",   // eth
    "\u00fe": "th",  // thorn
    "\u0131": "i",   // dotless i
};

/**
 * Accent-folding slugify. The shared recipe slugify drops non-ASCII outright,
 * which turns "Café" into "caf" and "Zürich" into "z-rich" — fine for English
 * recipe titles, wrong for European place and city names. Transliterate the
 * stubborn letters first, then decompose to NFD and strip the combining marks
 * so every base letter survives.
 */
export function placeSlugify(s: string): string {
    const folded = s
        .toLowerCase()
        .replace(/[\u00f8\u00e6\u0153\u00df\u0142\u0111\u00f0\u00fe\u0131]/g, (ch) => TRANSLITERATE[ch] ?? ch)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    return slugify(folded);
}

/**
 * Fold a POI's `addr:city` onto the canonical English seed-city name.
 *
 * OSM tags `addr:city` in the local language, so Munich arrives as both
 * "München" (tagged) and "Munich" (our fallback hint when the tag is missing).
 * Left alone that splits one city across /munchen and /munich — two half-empty
 * pages competing for the same query, and the wrong URL for the way people
 * actually search in English.
 *
 * Only folds when the POI is genuinely inside that seed city's radius AND its
 * name matches the seed name or a known alias. Neighbouring towns swept up by a
 * cell — Hove and Worthing near Brighton, say — keep their own identity rather
 * than being absorbed.
 */
export function canonicalCity(
    city: string,
    lat: number,
    lng: number
): { slug: string; name: string; region: string; country: string } | null {
    if (!city) return null;
    const target = placeSlugify(city);
    if (!target) return null;

    for (const c of SEED_CITIES) {
        // Cheap equirectangular check; a few km of error doesn't matter here.
        const dLat = (c.lat - lat) * 111.32;
        const dLng = (c.lng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
        if (Math.sqrt(dLat * dLat + dLng * dLng) > c.radiusKm + 5) continue;

        const names = [c.name, ...(c.aliases ?? [])];
        if (names.some((n) => placeSlugify(n) === target)) {
            // The seed `slug` is authoritative, not a slugify of the name — they
            // can legitimately differ (name "Washington DC", slug "washington-dc").
            return { slug: c.slug, name: c.name, region: c.region, country: c.country };
        }
    }
    return null;
}

/** "Pedro's" + Brooklyn + us -> "pedros-brooklyn-us", with a numeric suffix on collision. */
export async function uniquePlaceSlug(name: string, city: string, country: string): Promise<string> {
    const base = [placeSlugify(name), placeSlugify(city), placeSlugify(country)].filter(Boolean).join("-") || "place";
    let slug = base;
    for (let n = 2; ; n++) {
        const taken = await prisma.place.findUnique({ where: { slug }, select: { id: true } });
        if (!taken) return slug;
        slug = `${base}-${n}`;
    }
}

// The fields OSM owns. Anything outside this list (description, images,
// priceRange, ratings, status) is ours and a sync never touches it.
const OSM_OWNED = [
    "name", "category", "type", "lat", "lng", "address", "city", "citySlug",
    "region", "country", "postcode", "phone", "website", "openingHours",
    "cuisines", "wheelchair", "takeaway", "delivery", "outdoorSeating",
] as const;

/**
 * Insert or refresh one OSM-derived place.
 *
 * Respects `lockedFields`: any key a human has edited is skipped, so a
 * background refresh can never silently undo a member correction. `status` is
 * never written here either — if someone reported a place closed, a re-sync
 * must not quietly reopen it.
 */
export async function upsertOsmPlace(m: MappedPlace): Promise<"created" | "updated"> {
    const existing = await prisma.place.findUnique({
        where: { osmType_osmId: { osmType: m.osmType, osmId: m.osmId } },
        select: { id: true, lockedFields: true },
    });

    // Fold local-language city names onto the canonical English one before
    // anything is stored, so citySlug is stable regardless of how completely
    // a given POI happens to be tagged.
    const canon = canonicalCity(m.city, m.lat, m.lng);
    const city = canon?.name ?? m.city;

    const full = {
        name: m.name,
        category: m.category,
        type: m.type,
        lat: m.lat,
        lng: m.lng,
        address: m.address,
        city,
        citySlug: canon?.slug ?? placeSlugify(city),
        region: canon?.region ?? m.region,
        country: canon?.country ?? m.country,
        postcode: m.postcode,
        phone: m.phone,
        website: m.website,
        openingHours: m.openingHours,
        cuisines: JSON.stringify(m.cuisines),
        wheelchair: m.wheelchair,
        takeaway: m.takeaway,
        delivery: m.delivery,
        outdoorSeating: m.outdoorSeating,
    };

    if (!existing) {
        await prisma.place.create({
            data: {
                ...full,
                slug: await uniquePlaceSlug(m.name, full.city, full.country),
                source: "OSM",
                osmType: m.osmType,
                osmId: m.osmId,
                lastSyncedAt: new Date(),
            },
        });
        return "created";
    }

    let locked: string[] = [];
    try {
        const parsed: unknown = JSON.parse(existing.lockedFields);
        if (Array.isArray(parsed)) locked = parsed.map(String);
    } catch {
        // A corrupt lockedFields must not cause us to overwrite member edits —
        // treat it as "everything is locked" and only bump the sync timestamp.
        locked = [...OSM_OWNED];
    }

    const data: Record<string, unknown> = { lastSyncedAt: new Date() };
    for (const key of OSM_OWNED) {
        if (!locked.includes(key)) data[key] = full[key];
    }

    await prisma.place.update({ where: { id: existing.id }, data });
    return "updated";
}

/** Recompute a place's denormalised rating from its approved reviews. */
export async function refreshPlaceRating(placeId: string): Promise<void> {
    const agg = await prisma.placeReview.aggregate({
        where: { placeId, status: "APPROVED" },
        _avg: { score: true },
        _count: { _all: true },
    });
    await prisma.place.update({
        where: { id: placeId },
        data: {
            ratingAvg: agg._avg.score ?? 0,
            ratingCount: agg._count._all,
        },
    });
}
