// One-off: drain only the pending Fort Lauderdale-area cells, so the demo has
// real local data without waiting on a full global Overpass drain.
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { cellBBox } from "../src/lib/places";
import { fetchBBox, mapElements } from "../src/lib/places-osm";
import { upsertOsmPlace } from "../src/lib/places";

const HINT = { city: "Fort Lauderdale", region: "Florida", country: "us" };

async function main() {
    const cells = await prisma.geoCell.findMany({
        where: {
            status: "PENDING",
            lat: { gte: 25.9, lte: 26.35 },
            lng: { gte: -80.4, lte: -79.9 },
        },
        orderBy: { key: "asc" },
    });
    console.log(`${cells.length} pending FTL cells to drain`);

    let created = 0;
    for (const cell of cells) {
        try {
            const elements = await fetchBBox(cellBBox(cell.key));
            const mapped = mapElements(elements, HINT);
            for (const place of mapped) {
                const outcome = await upsertOsmPlace(place);
                if (outcome === "created") created++;
            }
            await prisma.geoCell.update({
                where: { key: cell.key },
                data: { status: mapped.length ? "OK" : "EMPTY", fetchedAt: new Date(), attempts: { increment: 1 } },
            });
            console.log(`  ${cell.key}: ${mapped.length} places (${created} new total)`);
        } catch (e) {
            await prisma.geoCell.update({
                where: { key: cell.key },
                data: { status: "ERROR", attempts: { increment: 1 } },
            });
            console.log(`  ${cell.key}: ERROR ${(e as Error).message}`);
        }
    }
    console.log(`done. ${created} new places created.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
