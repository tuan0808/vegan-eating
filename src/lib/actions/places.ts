// src/lib/actions/places.ts
"use server";

import { prisma } from "@/lib/prisma";
import { placesNear, placeSetting, type NearbyPlace } from "@/lib/places";
import { CATEGORIES, TYPES, type PlaceCategory, type PlaceType } from "@/lib/places-osm";
import { clientIp, ipLocation } from "@/lib/geo-ip";

// The read side the "Vegan Food Near Me" tool talks to. The heavy geo query
// lives in src/lib/places.ts — this just validates untrusted client input,
// clamps it, and hands back plain serialisable data for the island.

export type NearbyResponse = {
    ok: boolean;
    error?: string;
    places?: NearbyPlace[];
    hasMore?: boolean;
    radiusKm?: number; // the radius we actually used after clamping
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
    offset?: number;
}): Promise<NearbyResponse> {
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { ok: false, error: "That location doesn't look right — try again." };
    }

    const maxRadius = await placeSetting("places.searchRadiusMaxKm");
    const radiusKm = Math.min(Math.max(Number(input.radiusKm) || (await placeSetting("places.searchRadiusDefaultKm")), 1), maxRadius);

    try {
        const { places, hasMore } = await placesNear({
            lat,
            lng,
            radiusKm,
            category: cleanEnum<PlaceCategory>(input.category, CAT_SET),
            type: cleanEnum<PlaceType>(input.type, TYPE_SET),
            limit: 24,
            offset: Math.max(0, Math.floor(Number(input.offset) || 0)),
        });
        return { ok: true, places, hasMore, radiusKm };
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
    // Featured city shown when we can't resolve the visitor's IP (localhost/LAN)
    // or their local area has no data yet. Env-overridable; defaults to Fort
    // Lauderdale. In production real visitor IPs override this with their own
    // city, so this only surfaces on localhost and in truly-uncovered areas.
    const FALLBACK = {
        lat: Number(process.env.HOME_NEAR_LAT ?? 26.1224),
        lng: Number(process.env.HOME_NEAR_LNG ?? -80.1373),
        label: process.env.HOME_NEAR_LABEL ?? "Fort Lauderdale",
    };

    const loc = await ipLocation(await clientIp());
    const center = loc ? { lat: loc.lat, lng: loc.lng, label: loc.city || loc.label } : FALLBACK;

    let { places } = await placesNear({ lat: center.lat, lng: center.lng, radiusKm: 25, limit });
    let label = center.label;

    // IP resolved but the local area has no places yet — show the featured city
    // rather than an empty strip.
    if (!places.length && loc) {
        const r = await placesNear({ lat: FALLBACK.lat, lng: FALLBACK.lng, radiusKm: 25, limit });
        places = r.places;
        label = FALLBACK.label;
    }
    return { label, places };
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
