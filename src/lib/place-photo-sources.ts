// src/lib/place-photo-sources.ts
//
// Free photos for place cards, used instead of paid Google Places photos. Two
// sources, tried in order, each stored once on our CDN (both allow storing):
//
//   1. WEBSITE: the og:image / twitter:image the place's own site declares, kept
//      only when it looks like a real photo. Logos, wordmarks and flat banners
//      are rejected by a colour-spread check (calibrated on real sites: photos
//      have no colour bucket over ~17% of pixels and 30+ buckets in use; logos
//      have one bucket at 39%+ or a dozen buckets at most).
//   2. MAPILLARY: the nearest street-level 360° panorama (CC BY-SA, credit shown),
//      cropped to a ~100° window aimed at the venue. Flat (non-360) shots are
//      skipped: they usually point down the road, not at the shopfront.
//
// Lookups run in a small in-process background queue, kicked by the searches
// that list places, so a page render never waits on them; photos appear on a
// later search. A miss is retried after MISS_RETRY_MS. Admins can hide a bad
// photo (hidePlacePhoto), which blocks that exact source id and re-runs the
// lookup so the next candidate gets a turn. SERVER ONLY.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { uploadPngToSpaces } from "@/lib/spaces-upload";

const MAPILLARY_TOKEN = process.env.MAPILLARY_ACCESS_TOKEN;
const UA = "VeganEatingBot/1.0 (+https://veganeating.com)";

const MISS_RETRY_MS = 30 * 864e5;
const CONCURRENCY = 3;
const PAGE_TIMEOUT_MS = 8000;
const IMAGE_TIMEOUT_MS = 15000;
const MAX_PAGE_BYTES = 1_500_000;
const MAX_IMAGE_BYTES = 10_000_000;

const OUT_WIDTH = 960; // cards render ~400-640px wide
const MAPILLARY_RADIUS_M = 60;
const CROP_FOV_DEG = 100;

type Candidate = { buffer: Buffer; sourceId: string; credit: string; creditUrl: string | null };
type PlaceRow = { id: string; name: string; lat: number; lng: number; website: string | null; photoBlocked: string };

// --- Queue -------------------------------------------------------------------

const queue: string[] = [];
const queued = new Set<string>();
let active = 0;

/**
 * Queue a photo lookup for any of these places that has no photo and hasn't been
 * tried recently. Cheap to call on every search: one indexed query, then the
 * work happens in the background.
 */
export async function queuePlacePhotos(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const cutoff = new Date(Date.now() - MISS_RETRY_MS);
    const due = await prisma.place.findMany({
        where: {
            id: { in: ids.filter((id) => !queued.has(id)) },
            photoUrl: null,
            OR: [{ photoTriedAt: null }, { photoTriedAt: { lt: cutoff } }],
        },
        select: { id: true },
    });
    for (const { id } of due) {
        queued.add(id);
        queue.push(id);
    }
    pump();
}

function pump(): void {
    while (active < CONCURRENCY && queue.length) {
        const id = queue.shift()!;
        active++;
        resolvePlacePhoto(id)
            .catch((err) => console.error(`[place-photos] ${id} failed:`, err))
            .finally(() => {
                active--;
                queued.delete(id);
                pump();
            });
    }
}

/** Find, store and record one place's photo. Claims the place first so other
 *  instances (or a duplicate queue entry) skip it. */
async function resolvePlacePhoto(id: string): Promise<void> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - MISS_RETRY_MS);
    const claim = await prisma.place.updateMany({
        where: { id, photoUrl: null, OR: [{ photoTriedAt: null }, { photoTriedAt: { lt: cutoff } }] },
        data: { photoTriedAt: now },
    });
    if (claim.count !== 1) return;

    const place = await prisma.place.findUnique({
        where: { id },
        select: { id: true, name: true, lat: true, lng: true, website: true, photoBlocked: true },
    });
    if (!place) return;
    const blocked = new Set(parseList(place.photoBlocked));

    const found = await findPlacePhoto(place, blocked);
    if (!found) return; // miss: photoTriedAt already set, retried after MISS_RETRY_MS

    const webp = await sharp(found.buffer).resize({ width: OUT_WIDTH, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    const { url } = await uploadPngToSpaces(webp, `uploads/places/${place.id}/${now.getTime()}.webp`, "image/webp");
    await prisma.place.update({
        where: { id },
        data: { photoUrl: url, photoSourceId: found.sourceId, photoCredit: found.credit, photoCreditUrl: found.creditUrl },
    });
}

/** Best available photo for a place: website first, then Mapillary. */
export async function findPlacePhoto(place: PlaceRow, blocked: Set<string> = new Set()): Promise<Candidate | null> {
    return (await fromWebsite(place, blocked).catch(() => null)) ?? (await fromMapillary(place, blocked).catch(() => null));
}

/** Admin "hide": block the current photo's source and look for the next one. */
export async function hideAndRetryPlacePhoto(id: string): Promise<boolean> {
    const place = await prisma.place.findUnique({ where: { id }, select: { photoSourceId: true, photoBlocked: true } });
    if (!place) return false;
    const blocked = parseList(place.photoBlocked);
    if (place.photoSourceId && !blocked.includes(place.photoSourceId)) blocked.push(place.photoSourceId);
    await prisma.place.update({
        where: { id },
        data: {
            photoUrl: null, photoSourceId: null, photoCredit: null, photoCreditUrl: null,
            photoTriedAt: null, photoBlocked: JSON.stringify(blocked),
        },
    });
    await queuePlacePhotos([id]);
    return true;
}

function parseList(raw: string): string[] {
    try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
        return [];
    }
}

// --- Source 1: the place's website ------------------------------------------

const META_PATTERNS = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image/i,
];

async function fromWebsite(place: PlaceRow, blocked: Set<string>): Promise<Candidate | null> {
    const site = normalizeUrl(place.website);
    if (!site) return null;
    const page = await safeFetch(site, { timeoutMs: PAGE_TIMEOUT_MS, maxBytes: MAX_PAGE_BYTES });
    if (!page || !/html/i.test(page.contentType)) return null;
    const html = page.body.toString("utf8");

    let imageUrl: string | null = null;
    for (const re of META_PATTERNS) {
        const m = html.match(re);
        if (m) {
            imageUrl = normalizeUrl(decodeEntities(m[1].trim()), page.url);
            break;
        }
    }
    if (!imageUrl || /\.svg(\?|$)/i.test(imageUrl)) return null;
    const sourceId = `website:${imageUrl}`;
    if (blocked.has(sourceId)) return null;

    const img = await safeFetch(imageUrl, { timeoutMs: IMAGE_TIMEOUT_MS, maxBytes: MAX_IMAGE_BYTES });
    if (!img || !/^image\/(jpeg|png|webp|avif|gif)/i.test(img.contentType)) return null;
    if (!(await looksLikePhoto(img.body))) return null;

    return { buffer: img.body, sourceId, credit: `Photo: ${new URL(site).hostname.replace(/^www\./, "")}`, creditUrl: site };
}

/** Real photo vs logo/banner/flat colour. See the calibration note up top. */
async function looksLikePhoto(buf: Buffer): Promise<boolean> {
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w < 400 || h < 250) return false;
    const aspect = w / h;
    if (aspect < 0.6 || aspect > 2.5) return false; // strip banners

    const { data, info } = await sharp(buf).removeAlpha().resize(64, 64, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    const counts = new Map<number, number>();
    const px = info.width * info.height;
    for (let i = 0; i < data.length; i += info.channels) {
        const key = ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const top = Math.max(...counts.values()) / px;
    const used = [...counts.values()].filter((n) => n / px > 0.005).length;
    return top < 0.3 && used >= 20;
}

// --- Source 2: Mapillary street-level panoramas ------------------------------

type MlyImage = {
    id: string;
    thumb_2048_url?: string;
    computed_geometry?: { coordinates: [number, number] };
    geometry?: { coordinates: [number, number] };
    compass_angle?: number;
    computed_compass_angle?: number;
    is_pano?: boolean;
    creator?: { username?: string };
};

async function fromMapillary(place: PlaceRow, blocked: Set<string>): Promise<Candidate | null> {
    if (!MAPILLARY_TOKEN) return null;
    const d = 0.0006; // ~65 m each way; Mapillary caps the bbox area
    const qs = new URLSearchParams({
        access_token: MAPILLARY_TOKEN,
        bbox: [place.lng - d, place.lat - d, place.lng + d, place.lat + d].join(","),
        is_pano: "true",
        limit: "200",
        fields: "id,thumb_2048_url,computed_geometry,geometry,compass_angle,computed_compass_angle,is_pano,creator",
    });
    const res = await fetch(`https://graph.mapillary.com/images?${qs}`, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`mapillary http ${res.status}`);
    const images = ((await res.json()) as { data?: MlyImage[] }).data ?? [];

    let best: { im: MlyImage; dist: number; yaw: number } | null = null;
    for (const im of images) {
        const at = (im.computed_geometry ?? im.geometry)?.coordinates;
        const heading = im.computed_compass_angle ?? im.compass_angle;
        if (!im.is_pano || !at || heading == null || !im.thumb_2048_url || blocked.has(`mapillary:${im.id}`)) continue;
        const dist = metres(at[1], at[0], place.lat, place.lng);
        if (dist > MAPILLARY_RADIUS_M) continue;
        // The panorama's centre column faces `heading`; yaw is how far to turn to face the venue.
        const yaw = ((bearing(at[1], at[0], place.lat, place.lng) - heading + 540) % 360) - 180;
        if (!best || dist < best.dist) best = { im, dist, yaw };
    }
    if (!best) return null;

    const pano = await safeFetch(best.im.thumb_2048_url!, { timeoutMs: IMAGE_TIMEOUT_MS, maxBytes: MAX_IMAGE_BYTES });
    if (!pano) return null;
    const user = best.im.creator?.username;
    return {
        buffer: await cropToward(pano.body, best.yaw),
        sourceId: `mapillary:${best.im.id}`,
        credit: user ? `© ${user} · Mapillary` : "© Mapillary",
        creditUrl: `https://www.mapillary.com/app/?pKey=${best.im.id}&focus=photo`,
    };
}

/** Crop an equirectangular panorama to a 3:2 window centred `yaw` degrees from
 *  its centre, just above the horizon (where shopfronts are). Wraps at the seam. */
async function cropToward(buf: Buffer, yaw: number): Promise<Buffer> {
    const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width;
    const H = info.height;
    const fw = Math.round((W * CROP_FOV_DEG) / 360);
    const fh = Math.min(Math.round((fw * 2) / 3), H);
    const top = Math.min(Math.max(0, Math.round(H * 0.5 - fh * 0.55)), H - fh);
    let left = Math.round(W / 2 + (yaw / 360) * W - fw / 2);
    left = ((left % W) + W) % W;

    const raw = { raw: { width: W, height: H, channels: info.channels } } as const;
    if (left + fw <= W) {
        return sharp(data, raw).extract({ left, top, width: fw, height: fh }).png().toBuffer();
    }
    // Window crosses the seam: stitch the right edge and the left edge together.
    const a = await sharp(data, raw).extract({ left, top, width: W - left, height: fh }).png().toBuffer();
    const b = await sharp(data, raw).extract({ left: 0, top, width: fw - (W - left), height: fh }).png().toBuffer();
    return sharp({ create: { width: fw, height: fh, channels: 3, background: "#000" } })
        .composite([{ input: a, left: 0, top: 0 }, { input: b, left: W - left, top: 0 }])
        .png()
        .toBuffer();
}

function metres(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const r = (x: number) => (x * Math.PI) / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const r = (x: number) => (x * Math.PI) / 180;
    const y = Math.sin(r(lng2 - lng1)) * Math.cos(r(lat2));
    const x = Math.cos(r(lat1)) * Math.sin(r(lat2)) - Math.sin(r(lat1)) * Math.cos(r(lat2)) * Math.cos(r(lng2 - lng1));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// --- Safe fetching of untrusted URLs -----------------------------------------
// Website URLs come from OSM (anyone can edit), so every hop is checked against
// private/internal addresses before we connect: no SSRF into our own network.

async function safeFetch(
    url: string,
    opts: { timeoutMs: number; maxBytes: number },
): Promise<{ url: string; contentType: string; body: Buffer } | null> {
    let current = url;
    for (let hop = 0; hop < 4; hop++) {
        if (!(await isPublicUrl(current))) return null;
        const res = await fetch(current, {
            redirect: "manual",
            headers: { "User-Agent": UA, Accept: "text/html,image/*;q=0.9,*/*;q=0.5" },
            signal: AbortSignal.timeout(opts.timeoutMs),
        });
        if (res.status >= 300 && res.status < 400) {
            const next = res.headers.get("location");
            if (!next) return null;
            current = new URL(next, current).toString();
            continue;
        }
        if (!res.ok || !res.body) return null;
        if (Number(res.headers.get("content-length") ?? 0) > opts.maxBytes) return null;

        const chunks: Uint8Array[] = [];
        let size = 0;
        const reader = res.body.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > opts.maxBytes) {
                await reader.cancel();
                // Pages: the <head> we need is near the top, so a truncated read is fine.
                if (/html/i.test(res.headers.get("content-type") ?? "")) break;
                return null;
            }
            chunks.push(value);
        }
        return { url: current, contentType: res.headers.get("content-type") ?? "", body: Buffer.concat(chunks) };
    }
    return null;
}

async function isPublicUrl(raw: string): Promise<boolean> {
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        return false;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (u.port && u.port !== "80" && u.port !== "443") return false;
    const host = u.hostname.replace(/^\[|\]$/g, "");
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
    return addrs.length > 0 && addrs.every((a) => !isPrivateIp(a.address));
}

function isPrivateIp(ip: string): boolean {
    const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
    if (isIP(v4) === 4) {
        const [a, b] = v4.split(".").map(Number);
        return (
            a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
        );
    }
    const v6 = ip.toLowerCase();
    return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

function normalizeUrl(raw: string | null | undefined, base?: string): string | null {
    if (!raw) return null;
    try {
        const withScheme = base || /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        return new URL(withScheme, base).toString();
    } catch {
        return null;
    }
}

function decodeEntities(s: string): string {
    return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
