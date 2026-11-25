// src/lib/vendor-config.ts
//
// Vendor promo codes shown in the nav "Forum" dropdown, editable at
// Admin → Vendor deals so staff can change them without a deploy. Stored as JSON
// in the Setting KV store (no migration). "Prominent" vendors are surfaced in the
// nav; everything else lives in the Vendor Deals forum board (dealsHref).
//
// SECURITY: the promo `code` is members-only. It is gated at the API layer
// (/api/vendors) — logged-out requests never receive the code string — so the
// obfuscation can't be undone by viewing source.
import { getSetting, setSetting } from "./settings";

const KEY = "vendors.config";

export type Vendor = {
    id: string; // stable id for list keys / edits
    name: string;
    url?: string; // vendor site or affiliate link
    code: string; // promo code (members-only)
    blurb?: string; // short offer, e.g. "20% off sitewide"
    prominent: boolean; // highlighted in the nav; others live in the forum
    featured?: boolean; // the single "MAIN" premium slot (big card on the nav's right)
    image?: string; // uploaded card image for the featured slot (URL or /uploads path)
    threadSlug?: string; // the auto-created forum thread for this code (once created)
};

export type VendorConfig = {
    vendors: Vendor[];
    dealsHref: string; // where "browse all deals" points (the Vendor Deals board)
    updatedAt?: string;
    updatedBy?: string;
};

export const VENDOR_DEFAULTS: VendorConfig = { vendors: [], dealsHref: "/forum" };

export const MAX_VENDORS = 60;
export const MAX_FIELD = 200;
export const MAX_URL = 500; // image/CDN paths run longer than ordinary fields

/** The shape sent to the browser: code is null unless the viewer is a member. */
export type PublicVendor = {
    id: string;
    name: string;
    url?: string;
    blurb?: string;
    hasCode: boolean;
    code: string | null;
    image?: string; // only populated for the featured card
};

const clip = (s: unknown): string => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_FIELD);
const clipUrl = (s: unknown): string => String(s ?? "").trim().slice(0, MAX_URL);

function normalizeVendor(r: unknown, i: number): Vendor | null {
    if (!r || typeof r !== "object") return null;
    const o = r as Record<string, unknown>;
    const name = clip(o.name);
    if (!name) return null;
    return {
        id: clip(o.id) || `v-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`,
        name,
        url: clip(o.url) || undefined,
        code: clip(o.code),
        blurb: clip(o.blurb) || undefined,
        prominent: !!o.prominent,
        featured: !!o.featured,
        image: clipUrl(o.image) || undefined,
        threadSlug: clip(o.threadSlug) || undefined,
    };
}

export async function getVendorConfig(): Promise<VendorConfig> {
    const raw = await getSetting(KEY).catch(() => null);
    if (!raw) return { ...VENDOR_DEFAULTS };
    try {
        const v = JSON.parse(raw) as Partial<VendorConfig>;
        const vendors = Array.isArray(v.vendors)
            ? v.vendors.map(normalizeVendor).filter((x): x is Vendor => x !== null)
            : [];
        return {
            vendors,
            dealsHref: typeof v.dealsHref === "string" && v.dealsHref.trim() ? v.dealsHref.trim() : VENDOR_DEFAULTS.dealsHref,
            updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : undefined,
            updatedBy: typeof v.updatedBy === "string" ? v.updatedBy : undefined,
        };
    } catch {
        return { ...VENDOR_DEFAULTS };
    }
}

export async function saveVendorConfig(c: VendorConfig): Promise<void> {
    await setSetting(KEY, JSON.stringify(c));
}

/** Prominent vendors mapped for the browser, with the code gated by `loggedIn`. */
export function publicVendors(cfg: VendorConfig, loggedIn: boolean): PublicVendor[] {
    return cfg.vendors
        .filter((v) => v.prominent)
        .map((v) => ({
            id: v.id,
            name: v.name,
            url: v.url,
            blurb: v.blurb,
            hasCode: !!v.code,
            code: loggedIn ? v.code || null : null,
        }));
}

/**
 * The single "MAIN" vendor shown in the big card on the nav's right — the premium
 * ad spot. There's only one slot, so the first featured vendor wins. Returns null
 * when no vendor is featured (the card then falls back to the forum link).
 */
export function featuredVendor(cfg: VendorConfig, loggedIn: boolean): PublicVendor | null {
    const v = cfg.vendors.find((x) => x.featured);
    if (!v) return null;
    return {
        id: v.id,
        name: v.name,
        url: v.url,
        blurb: v.blurb,
        hasCode: !!v.code,
        code: loggedIn ? v.code || null : null,
        image: v.image,
    };
}
