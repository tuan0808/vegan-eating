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

// Don't re-resolve a place for 30 days — including misses, so a place Google
// doesn't know isn't searched (and billed) on every render.
const RECHECK_MS = 30 * 864e5;
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

/** Cached photo reference for a place, resolving + persisting it on first need. */
export async function resolvePhotoRef(place: PhotoLookup): Promise<string | null> {
    if (!KEY) return null;
    if (place.googlePhotoRef) return place.googlePhotoRef;
    if (place.photoCheckedAt && Date.now() - place.photoCheckedAt.getTime() < RECHECK_MS) return null;

    const found = await searchPhoto(place);

    // Persist the outcome (hit or miss) so we don't re-bill Google next time.
    await prisma.place
        .update({
            where: { id: place.id },
            data: {
                googlePlaceId: found?.placeId ?? place.googlePlaceId,
                googlePhotoRef: found?.photoName ?? null,
                photoCheckedAt: new Date(),
            },
        })
        .catch(() => {
            /* cache write is best-effort */
        });

    return found?.photoName ?? null;
}

async function searchPhoto(place: PhotoLookup): Promise<{ placeId: string; photoName: string } | null> {
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
                "X-Goog-FieldMask": "places.id,places.photos",
            },
            body: JSON.stringify({
                textQuery: [place.name, place.city].filter(Boolean).join(", "),
                // Bias tightly to the known coordinates so we match THIS venue,
                // not a same-named one elsewhere.
                locationBias: { circle: { center: { latitude: place.lat, longitude: place.lng }, radius: 300 } },
                maxResultCount: 1,
            }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { places?: Array<{ id: string; photos?: Array<{ name: string }> }> };
        const hit = data.places?.[0];
        const photoName = hit?.photos?.[0]?.name;
        if (!hit || !photoName) return null;
        return { placeId: hit.id, photoName };
    } catch {
        return null; // timeout / network / parse — caller falls back to placeholder
    } finally {
        clearTimeout(timer);
    }
}

/** Google media URL for a photo resource name. Key stays server-side (proxy only). */
export function photoMediaUrl(photoName: string, maxWidthPx = 640): string {
    const w = Math.min(Math.max(Math.floor(maxWidthPx), 100), 1600);
    return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${w}&key=${KEY}`;
}
