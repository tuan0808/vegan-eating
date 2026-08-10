// scripts/prewarm-photos.ts
//
// Warm the Google Places cache (photo reference + rating) for the places a demo
// visitor actually sees first, so the "Vegan Food Near Me" cards show real
// photos and "4.5 ★ (1,246)" on first paint instead of lazy-loading each one
// with a per-card round trip to Google mid-demo.
//
//   npx tsx scripts/prewarm-photos.ts                    # default demo centres
//   npx tsx scripts/prewarm-photos.ts --reset-misses     # also re-check places
//                                                        # cached as misses
//   npx tsx scripts/prewarm-photos.ts --lat=26.12 --lng=-80.14 --radius=15 --limit=60
//
// Each resolved place is one billed Text Search call, so the script prints an
// estimate and is idempotent: a place resolved within the 30-day recheck window
// is skipped (no re-bill). Run --reset-misses once after the API key starts
// working to clear stale misses from a period when it didn't.
//
// Reads GOOGLE_MAPS_API_KEY from .env — with no key it exits without spending.

import { config } from "dotenv";
config({ path: ".env.local" }); // loaded first => takes precedence
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { placesNear } from "../src/lib/places";

type Center = { label: string; lat: number; lng: number };

// Featured demo centres. Fort Lauderdale is the home-page fallback; the rest are
// well-covered cities so the demo looks alive wherever it's driven to.
const DEMO_CENTERS: Center[] = [
    { label: "Fort Lauderdale", lat: 26.1224, lng: -80.1373 },
    { label: "New York", lat: 40.7128, lng: -74.006 },
    { label: "London", lat: 51.5074, lng: -0.1278 },
    { label: "Berlin", lat: 52.52, lng: 13.405 },
    { label: "Paris", lat: 48.8566, lng: 2.3522 },
];

function arg(name: string): string | undefined {
    const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
    return hit?.slice(name.length + 3);
}
const flag = (name: string) => process.argv.slice(2).includes(`--${name}`);

const RADIUS = Number(arg("radius")) || 12;
const LIMIT = Number(arg("limit")) || 48;
const CONCURRENCY = 4;

async function main() {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
        console.error("No GOOGLE_MAPS_API_KEY in env — nothing to warm. Exiting.");
        process.exit(1);
    }
    // Import after env is loaded: place-photos reads the key at module-eval time.
    const { resolveGoogleMeta } = await import("../src/lib/place-photos");

    if (flag("reset-misses")) {
        const { count } = await prisma.place.updateMany({
            where: { googlePhotoRef: null, photoCheckedAt: { not: null } },
            data: { photoCheckedAt: null },
        });
        console.log(`Reset ${count} stale miss-caches so they re-resolve.\n`);
    }

    const centers: Center[] =
        arg("lat") && arg("lng")
            ? [{ label: arg("label") || "custom", lat: Number(arg("lat")), lng: Number(arg("lng")) }]
            : DEMO_CENTERS;

    // Collect the exact places each centre would surface, deduped across centres.
    const ids = new Set<string>();
    for (const c of centers) {
        const { places } = await placesNear({ lat: c.lat, lng: c.lng, radiusKm: RADIUS, limit: LIMIT });
        places.forEach((p) => ids.add(p.id));
        console.log(`${c.label.padEnd(18)} ${places.length} places within ${RADIUS} km`);
    }

    const targets = await prisma.place.findMany({
        where: { id: { in: [...ids] } },
        select: {
            id: true, name: true, lat: true, lng: true, city: true,
            googlePlaceId: true, googlePhotoRef: true, photoCheckedAt: true,
        },
    });

    console.log(`\n${targets.length} unique places to warm (~${targets.length} billed lookups, already-cached skipped).\n`);

    let photos = 0, ratings = 0, misses = 0, skipped = 0, done = 0;
    // Simple fixed-size worker pool over the target list.
    const queue = [...targets];
    async function worker() {
        for (;;) {
            const place = queue.shift();
            if (!place) return;
            const meta = await resolveGoogleMeta(place);
            done++;
            if (meta === null) {
                skipped++; // inside recheck window — no call made
            } else {
                if (meta.photoName) photos++;
                if (meta.ratingCount) ratings++;
                if (!meta.photoName && !meta.ratingCount) misses++;
            }
            if (done % 20 === 0) console.log(`  ${done}/${targets.length}…`);
        }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.log(`\nDone. ${photos} with photos, ${ratings} with ratings, ${misses} no match, ${skipped} already cached.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
