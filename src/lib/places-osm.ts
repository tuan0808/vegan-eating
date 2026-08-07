// src/lib/places-osm.ts
//
// The OpenStreetMap side of the "Vegan Food Near Me" pipeline: a polite
// Overpass client plus the tag -> Place mapper.
//
// Nothing here is ever called on a user request path. Overpass is capped around
// 10k requests/day and the OSM Foundation explicitly reserves the right to
// withdraw access, so it seeds our own Place table and nothing more. See
// src/lib/places.ts for the read side.
//
// Usage policy we're bound by (breaking these gets the UA blocked):
//   - a descriptive User-Agent with a contact URL
//   - one request in flight at a time, >=1s apart
//   - back off on 429/504 rather than retrying hot

const PRIMARY = process.env.OVERPASS_ENDPOINT || "https://overpass-api.de/api/interpreter";
const FALLBACK = process.env.OVERPASS_ENDPOINT_FALLBACK || "https://overpass.kumi.systems/api/interpreter";
const USER_AGENT =
    process.env.GEO_USER_AGENT || "vegan eating (https://veganeating.com; contact@veganeating.com)";

const MIN_INTERVAL_MS = 1100; // >=1s between calls, per the usage policy
const REQUEST_TIMEOUT_MS = 90_000;

// ---------------------------------------------------------------------------
// Serialised, rate-limited request queue. Every Overpass call in the process
// funnels through this, so parallel callers can't accidentally burst.
// ---------------------------------------------------------------------------
let chain: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(async () => {
        const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await sleep(wait);
        try {
            return await fn();
        } finally {
            lastCallAt = Date.now();
        }
    });
    // Keep the chain alive even when a link rejects, or every later call fails too.
    chain = run.catch(() => undefined);
    return run as Promise<T>;
}

// ---------------------------------------------------------------------------
// Raw Overpass types
// ---------------------------------------------------------------------------
export type OsmElement = {
    type: "node" | "way" | "relation";
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
};

export type BBox = { south: number; west: number; north: number; east: number };

/**
 * The union query. Four buckets worth having:
 *   1. anything explicitly tagged for vegans
 *   2. strictly vegetarian venues (vegan-friendly by definition)
 *   3. venues whose cuisine says vegan/vegetarian but that lack diet:* tags
 *   4. health food shops, greengrocers and farm shops
 *
 * `nwr` covers nodes, ways and relations; `out center` collapses ways and
 * relations to a single representative coordinate so everything normalises to
 * one lat/lng.
 */
export function buildQuery(bbox: BBox, timeoutSec = 50): string {
    const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
    return `[out:json][timeout:${timeoutSec}];
(
  nwr["diet:vegan"~"^(yes|only|limited)$"](${b});
  nwr["diet:vegetarian"="only"](${b});
  nwr["cuisine"~"vegan|vegetarian"](${b});
  nwr["shop"~"^(health_food|greengrocer|farm)$"](${b});
);
out center tags;`;
}

export class OverpassError extends Error {
    constructor(
        message: string,
        readonly status?: number,
        readonly retryable = false
    ) {
        super(message);
        this.name = "OverpassError";
    }
}

async function post(endpoint: string, query: string): Promise<OsmElement[]> {
    let res: Response;
    try {
        res = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": USER_AGENT,
                Accept: "application/json",
            },
            body: new URLSearchParams({ data: query }).toString(),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (e) {
        // Network failure or timeout — always worth another endpoint/attempt.
        throw new OverpassError(e instanceof Error ? e.message : String(e), undefined, true);
    }

    if (!res.ok) {
        // 429 = rate limited, 504 = the server gave up mid-query. Both are
        // "come back later", not "this query is wrong".
        const retryable = res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504;
        throw new OverpassError(`Overpass ${res.status} ${res.statusText}`, res.status, retryable);
    }

    // Overpass can return 200 with an HTML error body when it's overloaded.
    const text = await res.text();
    let json: { elements?: OsmElement[] };
    try {
        json = JSON.parse(text);
    } catch {
        throw new OverpassError(`Overpass returned non-JSON (${text.slice(0, 120)})`, res.status, true);
    }
    return json.elements ?? [];
}

/**
 * Run a query with retries: primary endpoint, then the fallback, with
 * exponential backoff between attempts. Non-retryable errors (a malformed
 * query, a 400) fail fast — retrying them just burns quota.
 */
export async function runQuery(query: string, attempts = 3): Promise<OsmElement[]> {
    const endpoints = [PRIMARY, FALLBACK];
    let lastErr: unknown;

    for (let i = 0; i < attempts; i++) {
        const endpoint = endpoints[i % endpoints.length];
        try {
            return await enqueue(() => post(endpoint, query));
        } catch (e) {
            lastErr = e;
            if (e instanceof OverpassError && !e.retryable) throw e;
            if (i < attempts - 1) await sleep(2000 * 2 ** i); // 2s, 4s
        }
    }
    throw lastErr instanceof Error ? lastErr : new OverpassError(String(lastErr));
}

/** Fetch every interesting POI inside a bounding box. */
export async function fetchBBox(bbox: BBox): Promise<OsmElement[]> {
    return runQuery(buildQuery(bbox));
}

// ---------------------------------------------------------------------------
// Tag -> Place mapping
// ---------------------------------------------------------------------------
export const CATEGORIES = ["VEGAN", "VEGETARIAN", "VEG_FRIENDLY"] as const;
export type PlaceCategory = (typeof CATEGORIES)[number];

export const TYPES = [
    "RESTAURANT", "CAFE", "FAST_FOOD", "BAKERY", "ICE_CREAM", "JUICE_BAR",
    "FOOD_TRUCK", "BAR", "STORE", "MARKET", "OTHER",
] as const;
export type PlaceType = (typeof TYPES)[number];

/**
 * OSM diet tags -> our three-tier taxonomy.
 *   diet:vegan=only        a fully vegan venue
 *   diet:vegetarian=only   fully vegetarian, so always something to eat
 *   diet:vegan=yes|limited some vegan options
 * Returns null for things that matched the shop/cuisine arms of the query but
 * carry no signal at all, which the caller drops.
 */
export function mapCategory(tags: Record<string, string>): PlaceCategory | null {
    const vegan = tags["diet:vegan"];
    const vegetarian = tags["diet:vegetarian"];
    const cuisine = (tags.cuisine || "").toLowerCase();

    if (vegan === "only") return "VEGAN";
    if (vegetarian === "only") return "VEGETARIAN";
    if (vegan === "yes" || vegan === "limited") return "VEG_FRIENDLY";

    // No diet tags — fall back to cuisine, which is weaker but usually right
    // for a venue that put "vegan" in its cuisine list.
    if (/\bvegan\b/.test(cuisine)) return "VEGAN";
    if (/\bvegetarian\b/.test(cuisine)) return "VEGETARIAN";

    // Health food shops and farm shops reliably stock plant-based staples.
    if (tags.shop === "health_food" || tags.shop === "farm" || tags.shop === "greengrocer") {
        return "VEG_FRIENDLY";
    }
    return null;
}

/** OSM amenity/shop tags -> our venue types. */
export function mapType(tags: Record<string, string>): PlaceType {
    const { amenity, shop, craft, cuisine = "" } = tags;
    const c = cuisine.toLowerCase();

    if (amenity === "restaurant") return "RESTAURANT";
    if (amenity === "cafe") return "CAFE";
    if (amenity === "fast_food") {
        // Food trucks and juice bars are both tagged fast_food; the qualifiers
        // are what separate them.
        if (tags.street_vendor === "yes" || c.includes("food_truck")) return "FOOD_TRUCK";
        if (c.includes("juice") || c.includes("smoothie")) return "JUICE_BAR";
        if (c.includes("ice_cream")) return "ICE_CREAM";
        return "FAST_FOOD";
    }
    if (amenity === "ice_cream" || shop === "ice_cream") return "ICE_CREAM";
    if (amenity === "bar" || amenity === "pub" || amenity === "biergarten") return "BAR";
    if (amenity === "marketplace") return "MARKET";
    if (shop === "bakery" || craft === "bakery") return "BAKERY";
    if (shop === "farm") return "MARKET";
    if (shop === "health_food" || shop === "greengrocer" || shop === "supermarket") return "STORE";
    if (shop === "juice") return "JUICE_BAR";
    if (shop) return "STORE";
    return "OTHER";
}

/** Locality we couldn't read off the POI's own tags — supplied by the caller. */
export type LocalityHint = { city?: string; region?: string; country?: string };

export type MappedPlace = {
    name: string;
    category: PlaceCategory;
    type: PlaceType;
    lat: number;
    lng: number;
    address: string;
    city: string;
    region: string;
    country: string;
    postcode: string;
    phone: string | null;
    website: string | null;
    openingHours: string | null;
    cuisines: string[];
    wheelchair: string | null;
    takeaway: boolean;
    delivery: boolean;
    outdoorSeating: boolean;
    osmType: string;
    osmId: bigint;
};

function coords(el: OsmElement): { lat: number; lng: number } | null {
    if (typeof el.lat === "number" && typeof el.lon === "number") return { lat: el.lat, lng: el.lon };
    if (el.center) return { lat: el.center.lat, lng: el.center.lon };
    return null;
}

function street(tags: Record<string, string>): string {
    const num = tags["addr:housenumber"];
    const road = tags["addr:street"];
    if (num && road) return `${num} ${road}`;
    return road || tags["addr:place"] || "";
}

/**
 * One Overpass element -> a Place row, or null if it isn't worth storing.
 *
 * POIs almost never carry addr:country, and often not addr:city either, so the
 * caller passes a hint derived from the cell being ingested (a seed city, or a
 * single cached reverse-geocode of the cell centre). Tags always win over it.
 */
export function mapElement(el: OsmElement, hint: LocalityHint = {}): MappedPlace | null {
    const tags = el.tags;
    if (!tags) return null;

    // Unnamed POIs are noise — there's nothing to show a user.
    const name = (tags.name || "").trim();
    if (!name) return null;

    const category = mapCategory(tags);
    if (!category) return null;

    const point = coords(el);
    if (!point) return null;

    // Explicitly vegan-hostile venues occasionally carry diet:vegetarian=only
    // alongside diet:vegan=no. Trust the negative.
    if (tags["diet:vegan"] === "no" && category !== "VEGETARIAN") return null;

    const cuisines = (tags.cuisine || "")
        .split(";")
        .map((s) => s.trim().toLowerCase().replace(/_/g, " "))
        .filter(Boolean);

    return {
        name,
        category,
        type: mapType(tags),
        lat: point.lat,
        lng: point.lng,
        address: street(tags),
        city: tags["addr:city"] || tags["addr:suburb"] || hint.city || "",
        region: tags["addr:state"] || tags["addr:province"] || hint.region || "",
        country: (tags["addr:country"] || hint.country || "").toLowerCase(),
        postcode: tags["addr:postcode"] || "",
        phone: tags.phone || tags["contact:phone"] || null,
        website: tags.website || tags["contact:website"] || null,
        openingHours: tags.opening_hours || null,
        cuisines,
        wheelchair: tags.wheelchair || null,
        takeaway: tags.takeaway === "yes" || tags.takeaway === "only",
        delivery: tags.delivery === "yes",
        outdoorSeating: tags.outdoor_seating === "yes",
        osmType: el.type,
        osmId: BigInt(el.id),
    };
}

/** Map a whole Overpass response, dropping everything that doesn't qualify. */
export function mapElements(elements: OsmElement[], hint: LocalityHint = {}): MappedPlace[] {
    const out: MappedPlace[] = [];
    for (const el of elements) {
        const mapped = mapElement(el, hint);
        if (mapped) out.push(mapped);
    }
    return out;
}
