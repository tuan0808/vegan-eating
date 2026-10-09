// src/lib/city-images.ts
//
// AI-generated cover images for the "Top vegan friendly cities" cards (OpenAI
// gpt-image via openai-images.ts). Google Places has no usable photo for these
// cities, so each one gets a single generated image, stored on the CDN like the
// AI recipe images and recorded in the Setting KV table:
//
//   cityimg.<country>.<slug> = {"url": "..."}                    done
//                            | {"pendingAt": <ms>}               being generated
//                            | {"failedAt": <ms>, "error": "..."} retry later
//
// Generation is lazy and server-driven: pages that render city cards call
// withCityImages(), which attaches finished images and queues the missing ones in
// the background (one at a time). There's no public endpoint, so visitors can't
// trigger generation for arbitrary cities: only the cities our own pages list.
// SERVER ONLY.

import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/openai-images";
import { uploadPngToSpaces } from "@/lib/spaces-upload";
import type { CityAnchor } from "@/lib/actions/places";

export type CityWithImage = CityAnchor & { image?: string };

// The "top" cities: the /vegan-friendly-cities list, and the pool the home rail
// picks the visitor's nearest from. Also bounds how many images ever get made.
export const TOP_CITIES = 48;

type Entry = { url?: string; pendingAt?: number; failedAt?: number; error?: string };

// A claim older than this is presumed dead (restart/deploy mid-generation).
const PENDING_STALE_MS = 15 * 60 * 1000;
const RETRY_FAILED_MS = 24 * 60 * 60 * 1000;

const settingKey = (c: Pick<CityAnchor, "country" | "citySlug">) => `cityimg.${c.country}.${c.citySlug}`;

function parse(value: string | undefined): Entry | null {
    if (!value) return null;
    try {
        return JSON.parse(value) as Entry;
    } catch {
        return null;
    }
}

function countryName(code: string): string {
    try {
        return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code.toUpperCase();
    } catch {
        return code.toUpperCase();
    }
}

function prompt(c: CityAnchor): string {
    return [
        `Editorial travel photograph of ${c.city}, ${countryName(c.country)}.`,
        "A characteristic, recognisable street or neighbourhood scene of this city in warm natural daylight,",
        "with a welcoming plant-based café or fresh produce market in the foreground.",
        "Realistic photo, shallow depth of field, inviting and vibrant.",
        "No text, signage lettering, logos, watermarks or recognisable faces.",
    ].join(" ");
}

/** Attach finished images; queue generation for cities that don't have one yet. */
export async function withCityImages(cities: CityAnchor[]): Promise<CityWithImage[]> {
    if (!cities.length) return [];
    const rows = await prisma.setting
        .findMany({ where: { key: { in: cities.map(settingKey) } } })
        .catch(() => []);
    const byKey = new Map(rows.map((r) => [r.key, parse(r.value)]));

    const now = Date.now();
    const missing: CityAnchor[] = [];
    const out = cities.map((c) => {
        const e = byKey.get(settingKey(c));
        if (e?.url) return { ...c, image: e.url };
        const busy = e?.pendingAt != null && now - e.pendingAt < PENDING_STALE_MS;
        const cooling = e?.failedAt != null && now - e.failedAt < RETRY_FAILED_MS;
        if (!busy && !cooling) missing.push(c);
        return c;
    });
    if (missing.length && process.env.OPENAI_API_KEY) enqueue(missing);
    return out;
}

// --- In-process queue: one generation at a time per server instance ---------

const queue: CityAnchor[] = [];
const queued = new Set<string>();
let running = false;

function enqueue(cities: CityAnchor[]): void {
    for (const c of cities) {
        const k = settingKey(c);
        if (queued.has(k)) continue;
        queued.add(k);
        queue.push(c);
    }
    if (!running) void drain();
}

async function drain(): Promise<void> {
    running = true;
    try {
        for (let c = queue.shift(); c; c = queue.shift()) {
            try {
                await generateOne(c);
            } catch (err) {
                console.error(`[city-images] ${c.city} (${c.country}) failed:`, err);
            } finally {
                queued.delete(settingKey(c));
            }
        }
    } finally {
        running = false;
    }
}

/** Claim the city (so other instances skip it), generate, store, record. */
async function generateOne(c: CityAnchor): Promise<void> {
    const key = settingKey(c);
    const now = Date.now();

    // Re-check under a claim: another instance may have finished or started it.
    const claimed = await prisma.$transaction(async (tx) => {
        const cur = parse((await tx.setting.findUnique({ where: { key } }))?.value);
        if (cur?.url) return false;
        if (cur?.pendingAt != null && now - cur.pendingAt < PENDING_STALE_MS) return false;
        const value = JSON.stringify({ pendingAt: now } satisfies Entry);
        await tx.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
        return true;
    });
    if (!claimed) return;

    try {
        const png = await generateImage({ prompt: prompt(c), size: "1536x1024", quality: "medium" });
        // Cards render ~640px wide: a 1200px WebP is a fraction of the PNG's size.
        const webp = await sharp(png).resize({ width: 1200 }).webp({ quality: 80 }).toBuffer();
        const { url } = await uploadPngToSpaces(webp, `uploads/cities/${c.country}-${c.citySlug}-${now}.webp`, "image/webp");
        const value = JSON.stringify({ url } satisfies Entry);
        await prisma.setting.update({ where: { key }, data: { value } });
        console.log(`[city-images] generated ${c.city} (${c.country})`);
    } catch (err) {
        const value = JSON.stringify({ failedAt: Date.now(), error: String((err as Error)?.message ?? err).slice(0, 300) } satisfies Entry);
        await prisma.setting.update({ where: { key }, data: { value } }).catch(() => {});
        throw err;
    }
}
