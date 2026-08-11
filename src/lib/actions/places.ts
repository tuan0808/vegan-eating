// src/lib/actions/places.ts
"use server";

import { prisma } from "@/lib/prisma";
import { placesNear, placeSetting, radiusBBox, distanceKm, type NearbyPlace } from "@/lib/places";
import { CATEGORIES, TYPES, type PlaceCategory, type PlaceType } from "@/lib/places-osm";
import { clientIp, ipLocation } from "@/lib/geo-ip";
import { ensureAreaFetched } from "@/lib/places-sync";
import { resolveGoogleMeta, type PhotoLookup } from "@/lib/place-photos";

// How long a search waits for the on-demand Overpass fill before returning what
// it has so far. Kept short now that the client polls: a fast fill still lands
// inline, while a slow one returns `filling: true` quickly so the user sees
// "finding places…" rather than a multi-second hang. The fill runs on in the
// background and the client's retry picks up the result.
const FILL_BUDGET_MS = 5_000;

/**
 * Resolve `p`, but never wait longer than `ms` — returns null on timeout (or if
 * `p` rejects). The underlying promise keeps running, so a slow on-demand fill
 * finishes in the background and the client's next poll picks up the result.
 */
function withBudget<T>(p: Promise<T>, ms: number): Promise<T | null> {
    let timer: ReturnType<typeof setTimeout>;
    const cap = new Promise<null>((res) => {
        timer = setTimeout(() => res(null), ms);
    });
    return Promise.race([p.then((v) => v, () => null).finally(() => clearTimeout(timer)), cap]);
}

// The read side the "Vegan Food Near Me" tool talks to. The heavy geo query
// lives in src/lib/places.ts — this just validates untrusted client input,
// clamps it, and hands back plain serialisable data for the island.

export type NearbyResponse = {
    ok: boolean;
    error?: string;
    places?: NearbyPlace[];
    hasMore?: boolean;
    radiusKm?: number; // the radius we actually used after clamping
    // True when this area is still being pulled from Overpass in the background,
    // so the results may be incomplete (or empty). The client shows a "finding
    // places…" state and polls again shortly instead of treating it as final.
    filling?: boolean;
};

const CAT_SET = new Set<string>(CATEGORIES);
const TYPE_SET = new Set<string>(TYPES);

/** Coerce arbitrary client values into the known enums, dropping anything unknown. */
function cleanEnum<T extends string>(vals: unknown, allowed: Set<string>): T[] | undefined {
    if (!Array.isArray(vals)) return undefined;
    const out = vals.filter((v): v is T => typeof v === "string" && allowed.has(v));
    return out.length ? out : undefined;
}

export async function searchNearby(input: {
    lat: number;
    lng: number;
    radiusKm?: number;
    category?: string[];
    type?: string[];
    sort?: string;
    offset?: number;
}): Promise<NearbyResponse> {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { ok: false, error: "That location doesn't look right — try again." };
    }

    const maxRadius = await placeSetting("places.searchRadiusMaxKm");
    const radiusKm = Math.min(Math.max(Number(input.radiusKm) || (await placeSetting("places.searchRadiusDefaultKm")), 1), maxRadius);
    const offset = Math.max(0, Math.floor(Number(input.offset) || 0));

    try {
        // On-demand OSM fill: on the first page, make sure this area has been
        // pulled from Overpass so results appear *anywhere*, not just preseeded
        // cities. Time-boxed — a warm area returns in ms; a cold one keeps
        // filling in the background. `filling` tells the client the results may
        // be partial so it shows "finding places…" and polls again shortly.
        let filling = false;
        if (offset === 0) {
            const r = await withBudget(ensureAreaFetched(lat, lng, radiusKm), FILL_BUDGET_MS);
            // null => still running past the budget; in_progress/error => a fetch
            // is (or was) underway and a retry may yet turn up results.
            filling = r === null || r.status === "in_progress" || r.status === "error";
        }

        const { places, hasMore } = await placesNear({
            lat,
            lng,
            radiusKm,
            category: cleanEnum<PlaceCategory>(input.category, CAT_SET),
            type: cleanEnum<PlaceType>(input.type, TYPE_SET),
            sort: input.sort === "rating" ? "rating" : "distance",
            limit: 24,
            offset,
        });
        return { ok: true, places, hasMore, radiusKm, filling };
    } catch (err) {
        console.error("searchNearby failed", err);
        return { ok: false, error: "Something went wrong searching nearby. Please try again." };
    }
}

/**
 * Places to showcase in the home-page "Vegan food near you" section. Uses the
 * visitor's IP-derived location so the strip feels local on first paint; falls
 * back to a well-covered featured city on localhost/LAN or when the local area
 * has no data yet, so the section is never empty.
 */
export async function nearbyForHome(limit = 3): Promise<{ label: string; places: NearbyPlace[] }> {
    // Featured city used ONLY when we can't resolve the visitor's IP at all
    // (localhost/LAN or a provider failure). Env-overridable; defaults to Fort
    // Lauderdale. A real visitor's IP always overrides this with their own city.
    const FALLBACK = {
        lat: Number(process.env.HOME_NEAR_LAT ?? 26.1224),
        lng: Number(process.env.HOME_NEAR_LNG ?? -80.1373),
        label: process.env.HOME_NEAR_LABEL ?? "Fort Lauderdale",
    };

    const loc = await ipLocation(await clientIp());
    const center = loc ? { lat: loc.lat, lng: loc.lng, label: loc.city || loc.label } : FALLBACK;

    // Warm the visitor's real area from Overpass in the BACKGROUND — the landing
    // page render must never block on a network fetch. First-ever visitor from a
    // new city may see the strip hidden (empty) for one paint; by their next
    // visit it's cached and populated. Skip warming the featured fallback: it's
    // preseeded, and warming it would spend an Overpass call on every localhost
    // render.
    if (loc) {
        const fill = ensureAreaFetched(center.lat, center.lng, 25);
        fill.catch((e) => console.error("nearbyForHome warm failed", e));
    }

    const { places } = await placesNear({ lat: center.lat, lng: center.lng, radiusKm: 25, limit });

    // Deliberately NO geographic fallback for a real visitor: showing another
    // city's spots under "near <your city>" is misleading. The section only
    // renders when places.length > 0, so an as-yet-unwarmed area simply hides
    // the strip instead of lying about the location.
    return { label: center.label, places };
}

export type CityAnchor = {
    city: string;
    citySlug: string;
    country: string;
    count: number;
    lat: number;
    lng: number;
};

/**
 * Popular cities with a centroid, so a visitor who declines geolocation can
 * still jump straight to a well-covered city. Centroid is the mean of the
 * city's published places — close enough to seed a radius search.
 */
export async function popularCities(limit = 12): Promise<CityAnchor[]> {
    const min = await placeSetting("places.cityMinPlaces");
    const rows = await prisma.$queryRaw<
        Array<{ city: string; citySlug: string; country: string; count: bigint; lat: number; lng: number }>
    >`
        SELECT MIN("city") AS "city", "citySlug", "country",
               COUNT(*) AS "count", AVG("lat") AS "lat", AVG("lng") AS "lng"
        FROM "Place"
        WHERE "status" = 'PUBLISHED' AND "citySlug" <> '' AND "country" <> ''
        GROUP BY "citySlug", "country"
        HAVING COUNT(*) >= ${min}
        ORDER BY COUNT(*) DESC
        LIMIT ${limit}
    `;
    return rows.map((r) => ({
        city: r.city,
        citySlug: r.citySlug,
        country: r.country,
        count: Number(r.count),
        lat: r.lat,
        lng: r.lng,
    }));
}

// ---------------------------------------------------------------------------
// Home "near me" area: the nearest strip + a "10 best by Google rating" rail.
// Both come from one fill + one bounded Google-ratings pass so the two rails
// share the cost.
// ---------------------------------------------------------------------------
const EATERY_TYPES = new Set<string>(["RESTAURANT", "CAFE", "FAST_FOOD", "BAKERY", "JUICE_BAR", "ICE_CREAM", "FOOD_TRUCK", "BAR"]);
const MAX_RESOLVE = 14; // Google lookups per new area — bounds the cost
const RESOLVE_BUDGET_MS = 6_000;
const RESOLVE_CONCURRENCY = 4;

// Places whose Google meta is being resolved right now, so a second poll (or an
// overlapping visitor) doesn't fire a duplicate billed lookup for the same one.
const resolvingIds = new Set<string>();

type Candidate = NearbyPlace & { googlePlaceId: string | null; googlePhotoRef: string | null; photoCheckedAt: Date | null };

export type HomeNearbyResponse = {
    ok: boolean;
    error?: string;
    filling?: boolean; // area still filling or ratings still resolving — client polls
    nearest?: NearbyPlace[];
    topRated?: NearbyPlace[];
};

/** Nearest published places within the radius, with the extra Google fields the
 *  ratings pass needs. Bounding-box prefilter, true-distance trim in JS. */
async function candidatesNear(lat: number, lng: number, radiusKm: number, take: number): Promise<Candidate[]> {
    const bbox = radiusBBox(lat, lng, radiusKm);
    const rows = await prisma.place.findMany({
        where: {
            status: "PUBLISHED",
            lat: { gte: bbox.south, lte: bbox.north },
            lng: { gte: bbox.west, lte: bbox.east },
        },
        select: {
            id: true, slug: true, name: true, category: true, type: true, lat: true, lng: true,
            address: true, city: true, citySlug: true, region: true, country: true,
            phone: true, website: true, openingHours: true, cuisines: true, wheelchair: true,
            images: true, ratingAvg: true, ratingCount: true, googleRating: true, googleRatingCount: true,
            googlePlaceId: true, googlePhotoRef: true, photoCheckedAt: true,
        },
        take: 800, // bbox cap; nearest `take` kept after the true-distance trim
    });
    return rows
        .map((r) => ({ ...r, distanceKm: distanceKm(lat, lng, r.lat, r.lng) }) as Candidate)
        .filter((r) => r.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, take);
}

/** Resolve + persist Google ratings for the nearest eateries lacking one,
 *  bounded and deduped. Mutates each candidate's rating (and photoCheckedAt) in
 *  place so the caller's in-memory checks stay accurate. */
async function resolveRatings(cands: Candidate[]): Promise<void> {
    const targets = cands
        .filter((c) => EATERY_TYPES.has(c.type) && !c.photoCheckedAt && !resolvingIds.has(c.id))
        .slice(0, MAX_RESOLVE);
    if (!targets.length) return;

    targets.forEach((c) => resolvingIds.add(c.id));
    const queue = [...targets];
    async function worker() {
        for (;;) {
            const c = queue.shift();
            if (!c) return;
            try {
                const meta = await resolveGoogleMeta(c as PhotoLookup);
                if (meta) {
                    c.googleRating = meta.rating;
                    c.googleRatingCount = meta.ratingCount;
                }
                // resolveGoogleMeta persists photoCheckedAt on hit AND miss; mirror
                // that locally so this place isn't retried within this request.
                c.photoCheckedAt = new Date();
            } catch {
                /* leave unresolved — a later poll retries */
            } finally {
                resolvingIds.delete(c.id);
            }
        }
    }
    await Promise.all(Array.from({ length: RESOLVE_CONCURRENCY }, worker));
}

function toNearby(c: Candidate): NearbyPlace {
    return {
        id: c.id, slug: c.slug, name: c.name, category: c.category, type: c.type,
        lat: c.lat, lng: c.lng, address: c.address, city: c.city, citySlug: c.citySlug,
        region: c.region, country: c.country, phone: c.phone, website: c.website,
        openingHours: c.openingHours, cuisines: c.cuisines, wheelchair: c.wheelchair,
        images: c.images, ratingAvg: c.ratingAvg, ratingCount: c.ratingCount,
        googleRating: c.googleRating, googleRatingCount: c.googleRatingCount, distanceKm: c.distanceKm,
    };
}

/**
 * Powers the home page's "near me" area: the nearest few places and a "10 best
 * by Google rating" rail. Fills the area on demand (like searchNearby) and runs
 * one bounded Google-ratings pass; `filling` stays true while either is still
 * in flight so the client shows "finding…" and polls.
 */
export async function homeNearby(input: { lat: number; lng: number }): Promise<HomeNearbyResponse> {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { ok: false, error: "That location doesn't look right." };
    }
    const radiusKm = 25;

    try {
        const r = await withBudget(ensureAreaFetched(lat, lng, radiusKm), FILL_BUDGET_MS);
        let filling = r === null || r.status === "in_progress" || r.status === "error";

        const cands = await candidatesNear(lat, lng, radiusKm, 40);

        // Bounded Google-ratings pass. If it runs past the budget it keeps going
        // in the background (caching as it goes), so we flag `filling` and let the
        // client's poll pick up the persisted ratings on the next round.
        const done = await withBudget(resolveRatings(cands), RESOLVE_BUDGET_MS);
        if (done === null) filling = true;

        const nearest = cands.slice(0, 3).map(toNearby);
        const topRated = cands
            .filter((c) => EATERY_TYPES.has(c.type) && c.googleRating != null)
            .sort(
                (a, b) =>
                    b.googleRating! - a.googleRating! ||
                    (b.googleRatingCount ?? 0) - (a.googleRatingCount ?? 0) ||
                    a.distanceKm - b.distanceKm,
            )
            .slice(0, 10)
            .map(toNearby);

        // Eateries here but none rated yet, with lookups still outstanding — a
        // resolve is mid-flight; let the client poll once more (it caps retries).
        if (!topRated.length && cands.some((c) => EATERY_TYPES.has(c.type) && !c.photoCheckedAt)) filling = true;

        return { ok: true, filling, nearest, topRated };
    } catch (err) {
        console.error("homeNearby failed", err);
        return { ok: false, error: "Something went wrong loading places near you." };
    }
}
