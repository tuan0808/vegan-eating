// src/lib/place-photos.ts
//
// Google Places (New) photo resolution for the Vegan Food Near Me cards. OSM
// carries no photos, so — when a GOOGLE_MAPS_API_KEY is present — we match a
// place to Google by name + coordinates, cache its place_id + photo *reference*
// (allowed by Google's terms; the image bytes are never stored, only proxied on
// demand in /api/place-photo), and hand the reference back.
//
// Everything degrades to null with no key, no match, or any error, so the cards
// simply keep their gradient placeholder.
import { prisma } from "@/lib/prisma";

const KEY = process.env.GOOGLE_MAPS_API_KEY;

// Don't re-resolve a HIT for 30 days, so a matched place isn't re-billed every
// render. Re-check a MISS far sooner: misses are rare (most eateries have a
// photo), so the extra lookups are cheap, and a shorter window means an area
// that got no photo during a transient Google gap self-heals in days instead of
// staying blank for a month. NOTE: a *transient* failure is never cached as a
// miss at all (see resolveGoogleMeta) — only a definitive "Google has none".
const RECHECK_MS = 30 * 864e5;
const MISS_RECHECK_MS = 3 * 864e5;
const SEARCH_TIMEOUT_MS = 4000;

export function photosEnabled(): boolean {
    return Boolean(KEY);
}

export type PhotoLookup = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    city: string;
    googlePlaceId: string | null;
    googlePhotoRef: string | null;
    photoCheckedAt: Date | null;
};

type GoogleMeta = { placeId: string; photoName: string | null; rating: number | null; ratingCount: number | null };

/**
 * Resolve + persist a place's Google metadata (photo reference AND rating) in a
 * single billed lookup, caching the outcome so we don't re-hit Google. Returns
 * the full meta; callers that only need the photo use `resolvePhotoRef`.
 *
 * The rating is captured in the same searchText call as the photo, so surfacing
 * a real "4.5 ★ (1,246)" costs nothing beyond the photo lookup we already make.
 */
export async function resolveGoogleMeta(place: PhotoLookup): Promise<GoogleMeta | null> {
    if (!KEY) return null;
    if (place.photoCheckedAt) {
        // Hits stick for 30 days; misses are re-checked far sooner.
        const window = place.googlePhotoRef ? RECHECK_MS : MISS_RECHECK_MS;
        if (Date.now() - place.photoCheckedAt.getTime() < window) return null;
    }

    let found: GoogleMeta | null;
    try {
        found = await searchGoogle(place);
    } catch {
        // Transient failure (timeout / network / HTTP error). Do NOT persist a
        // miss — leaving photoCheckedAt untouched means this place is retried on
        // the next request instead of going dark for the whole recheck window.
        return null;
    }

    // Persist only a DEFINITIVE outcome (a real Google response — hit or genuine
    // no-match) so we don't re-bill Google next time.
    await prisma.place
        .update({
            where: { id: place.id },
            data: {
                googlePlaceId: found?.placeId ?? place.googlePlaceId,
                googlePhotoRef: found?.photoName ?? null,
                googleRating: found?.rating ?? null,
                googleRatingCount: found?.ratingCount ?? null,
                photoCheckedAt: new Date(),
            },
        })
        .catch(() => {
            /* cache write is best-effort */
        });

    return found;
}

/** Cached photo reference for a place, resolving + persisting it on first need. */
export async function resolvePhotoRef(place: PhotoLookup): Promise<string | null> {
    if (!KEY) return null;
    if (place.googlePhotoRef) return place.googlePhotoRef;
    const meta = await resolveGoogleMeta(place);
    return meta?.photoName ?? null;
}

/**
 * One Google Text Search. Returns the meta on a hit, `null` on a DEFINITIVE
 * no-match (Google responded fine, nothing there — safe to cache as a miss),
 * and THROWS on a transient failure (timeout / network / HTTP error) so the
 * caller can avoid caching a miss and retry later.
 */
async function searchGoogle(place: PhotoLookup): Promise<GoogleMeta | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
    try {
        const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            signal: ctrl.signal,
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": KEY as string,
                // Ask for only what we need — keeps the call in the cheaper SKU tier.
                "X-Goog-FieldMask": "places.id,places.photos,places.rating,places.userRatingCount",
            },
            body: JSON.stringify({
                textQuery: [place.name, place.city].filter(Boolean).join(", "),
                // Bias tightly to the known coordinates so we match THIS venue,
                // not a same-named one elsewhere.
                locationBias: { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 300 } },
                maxResultCount: 1,
            }),
        });
        // HTTP error (429/5xx/etc) is transient — throw so we don't cache a miss.
        if (!res.ok) throw new Error(`google searchText http ${res.status}`);
        const data = (await res.json()) as {
            places?: Array<{ id: string; photos?: Array<{ name: string }>; rating?: number; userRatingCount?: number }>;
        };
        const hit = data.places?.[0];
        if (!hit) return null; // definitive no-match
        return {
            placeId: hit.id,
            photoName: hit.photos?.[0]?.name ?? null,
            rating: typeof hit.rating === "number" ? hit.rating : null,
            ratingCount: typeof hit.userRatingCount === "number" ? hit.userRatingCount : null,
        };
    } finally {
        // timeout (abort) / network / parse errors propagate as transient.
        clearTimeout(timer);
    }
}

// --- City photos -----------------------------------------------------------
// Cities aren't rows in the Place table (they're aggregates of published
// places), so their Google photo reference is cached in the Setting KV table
// keyed by slug+country. Hits stick 30 days; a definitive miss is cached with
// the shorter MISS window; a transient failure isn't cached at all (retried
// next render) — same anti-poisoning rule as the place path above.

type CityPhotoLookup = { slug: string; country: string; name: string; lat: number; lng: number };
type CityPhotoCache = { ref: string | null; at: number };

const cityPhotoKey = (slug: string, country: string) => `city.photo:${slug}:${country}`;

/** Cached photo reference for a city, resolving + persisting it on first need. */
export async function resolveCityPhotoRef(city: CityPhotoLookup): Promise<string | null> {
    if (!KEY) return null;
    const key = cityPhotoKey(city.slug, city.country);

    const row = await prisma.setting.findUnique({ where: { key } }).catch(() => null);
    if (row?.value) {
        try {
            const cached = JSON.parse(row.value) as CityPhotoCache;
            const window = cached.ref ? RECHECK_MS : MISS_RECHECK_MS;
            if (Date.now() - cached.at < window) return cached.ref; // fresh hit OR cached miss
        } catch {
            /* corrupt cache — fall through and re-resolve */
        }
    }

    let ref: string | null;
    try {
        ref = await searchCityPhoto(city);
    } catch {
        return null; // transient — don't cache a miss, retry next render
    }

    const value = JSON.stringify({ ref, at: Date.now() } satisfies CityPhotoCache);
    await prisma.setting
        .upsert({ where: { key }, update: { value }, create: { key, value } })
        .catch(() => {
            /* cache write is best-effort */
        });
    return ref;
}

/**
 * searchText for the city locality, biased to its centroid. Returns the photo
 * ref (or null on a definitive no-match); THROWS on a transient failure so the
 * caller skips caching a miss — mirrors searchGoogle above.
 */
async function searchCityPhoto(city: CityPhotoLookup): Promise<string | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), SEARCH_TIMEOUT_MS);
    try {
        const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            signal: ctrl.signal,
            headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": KEY as string,
                "X-Goog-FieldMask": "places.photos",
            },
            body: JSON.stringify({
                textQuery: city.name,
                // Wide bias around the centroid so we land on THIS city's locality
                // (not a same-named town elsewhere), without over-constraining.
                locationBias: { circle: { center: { latitude: city.lat, longitude: city.lng }, radius: 20000 } },
                maxResultCount: 1,
            }),
        });
        if (!res.ok) throw new Error(`google searchText http ${res.status}`); // transient
        const data = (await res.json()) as { places?: Array<{ photos?: Array<{ name: string }> }> };
        return data.places?.[0]?.photos?.[0]?.name ?? null; // ref or definitive no-match
    } finally {
        // timeout (abort) / network / parse errors propagate as transient.
        clearTimeout(timer);
    }
}

/** Google media URL for a photo resource name. Key stays server-side (proxy only). */
export function photoMediaUrl(photoName: string, maxWidthPx = 640): string {
    const w = Math.min(Math.max(Math.floor(maxWidthPx), 100), 1600);
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${w}&key=${KEY}`;
}
