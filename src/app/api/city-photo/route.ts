// src/app/api/city-photo/route.ts
//
// Streams a Google Places photo for a CITY (locality), keeping the API key
// server-side. Cities aren't rows in the Place table, so the caller passes the
// city's slug/country (cache key) plus name/lat/lng (the Google lookup), unlike
// /api/place-photo which reads everything from the DB row. Returns 404 whenever
// there's no key, no match, or no photo — <CityPhoto> then falls back to the
// gradient placeholder on any non-200.
import type { NextRequest } from "next/server";
import { photosEnabled, resolveCityPhotoRef, photoMediaUrl } from "@/lib/place-photos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    if (!photosEnabled()) return new Response(null, { status: 404 });

    const q = req.nextUrl.searchParams;
    const slug = q.get("slug");
    const country = q.get("country");
    const name = q.get("name");
    const lat = Number(q.get("lat"));
    const lng = Number(q.get("lng"));
    if (!slug || !country || !name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return new Response(null, { status: 400 });
    }
    const w = Math.min(Math.max(Number(q.get("w")) || 640, 100), 1200);

    const ref = await resolveCityPhotoRef({ slug, country, name, lat, lng });
    if (!ref) return new Response(null, { status: 404 });

    // Google returns a 302 to the actual image bytes; fetch follows it.
    const upstream = await fetch(photoMediaUrl(ref, w));
    if (!upstream.ok || !upstream.body) return new Response(null, { status: 404 });

    return new Response(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
            // Transient browser/edge cache only — we don't persist the bytes.
            "Cache-Control": "public, max-age=86400",
        },
    });
}
