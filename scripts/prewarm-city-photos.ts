// scripts/prewarm-city-photos.ts
//
// Warm the Google Places CITY-photo cache for the "Top Vegan Friendly Cities"
// rail + /vegan-friendly-cities page, so the cards show a real city photo on
// first paint instead of resolving (and billing) one per visitor mid-demo.
//
// It hits the DEPLOYED app's own /api/city-photo endpoint for each popular
// city, which resolves + persists the photo ref into THAT app's Setting table.
// So it warms whichever DB the target app is wired to — no DB firewall dance.
//
//   npx tsx scripts/prewarm-city-photos.ts                      # warms beta (default)
//   npx tsx scripts/prewarm-city-photos.ts --base=https://veganeating.com --limit=48
//
// The city LIST comes from the local DB (popularCities) — local and beta share
// the same snapshot, so the set matches. Each new city is one billed Text
// Search on the target; already-cached cities (30-day window) cost nothing.

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { popularCities } from "../src/lib/actions/places";

function arg(name: string): string | undefined {
    const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
    return hit?.slice(name.length + 3);
}

const BASE = (arg("base") ?? "https://vegan-eating-beta-iqfu8.ondigitalocean.app").replace(/\/$/, "");
const LIMIT = Number(arg("limit")) || 48;
const WIDTH = Number(arg("w")) || 640;
const CONCURRENCY = 4;

async function main() {
    const cities = await popularCities(LIMIT);
    console.log(`Warming ${cities.length} city photos against ${BASE} …\n`);

    let hit = 0;
    let miss = 0;
    const results: string[] = [];

    async function warm(c: (typeof cities)[number]) {
        const url =
            `${BASE}/api/city-photo?slug=${encodeURIComponent(c.citySlug)}` +
            `&country=${encodeURIComponent(c.country)}&name=${encodeURIComponent(c.city)}` +
            `&lat=${c.lat}&lng=${c.lng}&w=${WIDTH}`;
        try {
            const res = await fetch(url);
            if (res.status === 200) {
                hit++;
                results.push(`  ✓ ${c.city}, ${c.country.toUpperCase()}`);
            } else {
                miss++;
                results.push(`  · ${c.city}, ${c.country.toUpperCase()} — no photo (${res.status})`);
            }
        } catch (e) {
            miss++;
            results.push(`  ! ${c.city}, ${c.country.toUpperCase()} — ${String(e)}`);
        }
    }

    // Bounded concurrency: fixed batches of CONCURRENCY.
    for (let i = 0; i < cities.length; i += CONCURRENCY) {
        await Promise.all(cities.slice(i, i + CONCURRENCY).map(warm));
    }

    results.sort().forEach((l) => console.log(l));
    console.log(`\nDone: ${hit} with photo, ${miss} without. (photos cached ~30 days on ${BASE})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        const { prisma } = await import("../src/lib/prisma");
        await prisma.$disconnect();
    });
