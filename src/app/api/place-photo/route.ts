// src/app/api/place-photo/route.ts
//
// Streams a Google Places photo for a place, keeping the API key server-side.
// Returns 404 whenever there's no key, no Google match, or no photo — the
// <PlacePhoto> client falls back to the gradient placeholder on any non-200.
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { photosEnabled, resolvePhotoRef, photoMediaUrl } from "@/lib/place-photos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    if (!photosEnabled()) return new Response(null, { status: 404 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return new Response(null, { status: 400 });
    const w = Math.min(Math.max(Number(req.nextUrl.searchParams.get("w")) || 640, 100), 1200);

    const place = await prisma.place.findUnique({
        where: { id },
        select: {
            id: true, name: true, lat: true, lng: true, city: true,
            googlePlaceId: true, googlePhotoRef: true, photoCheckedAt: true,
        },
    });
    if (!place) return new Response(null, { status: 404 });

    const ref = await resolvePhotoRef(place);
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
