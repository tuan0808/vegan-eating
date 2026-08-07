// scripts/ingest-places.ts
//
// Seed the Place table from OpenStreetMap.
//
//   npx tsx scripts/ingest-places.ts --dry                 # show the plan, call nothing
//   npx tsx scripts/ingest-places.ts --city=london         # queue + drain one city
//   npx tsx scripts/ingest-places.ts --queue-only          # queue every seed city, fetch nothing
//   npx tsx scripts/ingest-places.ts --limit=50            # drain 50 pending cells
//   npx tsx scripts/ingest-places.ts                       # queue all seed cities, drain the lot
//   npx tsx scripts/ingest-places.ts --stats               # just print the queue
//
// Pacing: the Overpass client serialises to one request/second, so a full seed
// of every city takes a while (roughly one second per 0.1deg cell). That's
// deliberate — the public endpoint allows ~10k requests/day and blocks
// user-agents that burst. Safe to Ctrl-C and re-run; cell state is durable and
// place upserts are keyed on the OSM id, so nothing duplicates.
//
// Runs against whatever DATABASE_URL is in the environment. Check it before
// pointing this at production.

import { config } from "dotenv";
config({ path: ".env.local" }); // loaded first => takes precedence
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { cellsCovering } from "../src/lib/places";
import { SEED_CITIES, seedCityBySlug } from "../src/lib/places-seed-cities";
import { cellQueueStats, drainCells, queueCity } from "../src/lib/places-sync";

const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const value = (name: string): string | undefined =>
    args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const DRY = has("--dry");
const QUEUE_ONLY = has("--queue-only");
const STATS_ONLY = has("--stats");
const CITY = value("city");
const LIMIT = value("limit") ? Number(value("limit")) : undefined;

function log(msg: string) {
    process.stdout.write(`${msg}\n`);
}

async function printStats(label: string) {
    const stats = await cellQueueStats();
    const places = await prisma.place.count();
    log(
        `${label}  cells: ${stats.PENDING} pending / ${stats.OK} ok / ${stats.EMPTY} empty / ${stats.ERROR} error` +
        `   places: ${places}`
    );
}

async function main() {
    if (STATS_ONLY) {
        await printStats("queue");
        return;
    }

    const cities = CITY
        ? (() => {
            const found = seedCityBySlug(CITY);
            if (!found) {
                log(`Unknown city "${CITY}". Known: ${SEED_CITIES.map((c) => c.slug).join(", ")}`);
                process.exit(1);
            }
            return [found];
        })()
        : SEED_CITIES;

    // --- dry run: show the cost, touch nothing ---
    if (DRY) {
        let total = 0;
        for (const c of cities) {
            const n = cellsCovering(c.lat, c.lng, c.radiusKm).length;
            total += n;
            log(`${c.slug.padEnd(16)} ${String(n).padStart(4)} cells  (r=${c.radiusKm}km)`);
        }
        const minutes = Math.ceil((total * 1.1) / 60);
        log(`\n${cities.length} cities, ${total} cells, ~${minutes} min of Overpass time at 1 req/s.`);
        log("No requests made. Drop --dry to run it.");
        return;
    }

    // --- queue ---
    let queued = 0;
    for (const c of cities) {
        const n = await queueCity(c);
        queued += n;
        if (n) log(`queued ${String(n).padStart(4)} cells for ${c.name}`);
    }
    log(`\nqueued ${queued} cells across ${cities.length} cities.`);
    await printStats("before");

    if (QUEUE_ONLY) {
        log("\n--queue-only: stopping before the Overpass drain.");
        return;
    }

    // --- drain ---
    // No limit given: drain everything that's pending, in batches, until the
    // queue stops shrinking. The batch loop means a mid-run failure still
    // leaves durable progress behind.
    const batch = LIMIT ?? 25;
    let totals = { cells: 0, created: 0, updated: 0, skipped: 0, errors: 0 };

    for (;;) {
        const r = await drainCells(batch, (m) => log(`  ${m}`));
        totals = {
            cells: totals.cells + r.cells,
            created: totals.created + r.created,
            updated: totals.updated + r.updated,
            skipped: totals.skipped + r.skipped,
            errors: totals.errors + r.errors,
        };
        if (r.cells === 0) break; // queue drained (or everything left is over its attempt cap)
        if (LIMIT !== undefined) break; // an explicit --limit means one batch only
        log(`  ... ${totals.cells} cells done, ${totals.created} new places`);
    }

    log(
        `\ndone. ${totals.cells} cells · ${totals.created} created · ${totals.updated} updated · ` +
        `${totals.skipped} skipped · ${totals.errors} errors`
    );
    await printStats("after");
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
