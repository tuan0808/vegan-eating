// src/lib/actions/places.ts
"use server";

import { prisma } from "@/lib/prisma";
import { placesNear, placeSetting, type NearbyPlace } from "@/lib/places";
import { CATEGORIES, TYPES, type PlaceCategory, type PlaceType } from "@/lib/places-osm";
import { clientIp, ipLocation } from "@/lib/geo-ip";
import { ensureAreaFetched } from "@/lib/places-sync";

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
