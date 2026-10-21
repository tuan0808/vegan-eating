// src/lib/local-markets.ts
//
// "Local" members + the QR-code giveaway (/whole-foods). A member is local when their ZIP falls
// in one of the configured markets; markets are listed in priority order, so a
// ZIP in both Boca Raton and Palm Beach County resolves to Boca (the core area).
// Markets and giveaway dates live in the Setting KV store (no migration) and are
// edited at Admin → Local signups; saving recomputes User.localMarket for
// everyone with a ZIP, so the stored column never goes stale.
import { prisma } from "./prisma";
import { getSetting, setSetting } from "./settings";

const K_CONFIG = "local.config";

export const IG_URL = "https://www.instagram.com/veganeating_com/";
export const IG_HANDLE = "veganeating_com";

export type Market = { key: string; name: string; zips: string[] };
export type Giveaway = {
    name: string;
    start: string; // YYYY-MM-DD, entries open (inclusive, Eastern time)
    end: string; // YYYY-MM-DD, last day to enter (inclusive, Eastern time)
    drawDate: string; // YYYY-MM-DD, shown on the form
};
export type LocalConfig = { markets: Market[]; giveaway: Giveaway };

// Boca Raton proper, incl. PO-box ZIPs.
const BOCA_ZIPS = [
    "33427", "33428", "33429", "33431", "33432", "33433", "33434", "33481",
    "33486", "33487", "33488", "33496", "33497", "33498", "33499",
];
// The rest of Palm Beach County (Boca's ZIPs are matched first, above).
const PALM_BEACH_ZIPS = [
    "33401", "33402", "33403", "33404", "33405", "33406", "33407", "33408", "33409",
    "33410", "33411", "33412", "33413", "33414", "33415", "33416", "33417", "33418",
    "33419", "33420", "33421", "33422", "33424", "33425", "33426", "33430", "33435",
    "33436", "33437", "33438", "33444", "33445", "33446", "33448", "33449", "33454",
    "33458", "33459", "33460", "33461", "33462", "33463", "33464", "33465", "33466",
    "33467", "33468", "33469", "33470", "33472", "33473", "33474", "33476", "33477",
    "33478", "33480", "33482", "33483", "33484", "33493",
];

export const LOCAL_DEFAULTS: LocalConfig = {
    markets: [
        { key: "boca", name: "Boca Raton", zips: BOCA_ZIPS },
        { key: "palm-beach", name: "Palm Beach County", zips: PALM_BEACH_ZIPS },
    ],
    giveaway: { name: "Whole Foods giveaway", start: "2026-10-21", end: "2026-12-10", drawDate: "2026-12-11" },
};

export async function getLocalConfig(): Promise<LocalConfig> {
    const raw = await getSetting(K_CONFIG).catch(() => null);
    if (!raw) return LOCAL_DEFAULTS;
    try {
        const v = JSON.parse(raw) as Partial<LocalConfig>;
        return {
            markets: Array.isArray(v.markets) ? v.markets : LOCAL_DEFAULTS.markets,
            giveaway: { ...LOCAL_DEFAULTS.giveaway, ...(v.giveaway ?? {}) },
        };
    } catch {
        return LOCAL_DEFAULTS;
    }
}

/** Save + re-derive every member's localMarket from their ZIP. Returns rows changed. */
export async function saveLocalConfig(c: LocalConfig): Promise<number> {
    await setSetting(K_CONFIG, JSON.stringify(c));
    const users = await prisma.user.findMany({
        where: { zipCode: { not: null } },
        select: { id: true, zipCode: true, localMarket: true },
    });
    let changed = 0;
    for (const u of users) {
        const m = marketForZip(c.markets, u.zipCode);
        if (m !== u.localMarket) {
            await prisma.user.update({ where: { id: u.id }, data: { localMarket: m } });
            changed++;
        }
    }
    return changed;
}

export function marketForZip(markets: Market[], zip: string | null | undefined): string | null {
    if (!zip) return null;
    return markets.find((m) => m.zips.includes(zip))?.key ?? null;
}

/** "33432", "33432-1234" → "33432"; anything else → null. */
export function normalizeZip(raw: string | null | undefined): string | null {
    const m = String(raw ?? "").trim().match(/^(\d{5})(?:-\d{4})?$/);
    return m ? m[1] : null;
}

/** "@Name", "instagram.com/name/", "name" → "name"; invalid → null. */
export function normalizeIgHandle(raw: string | null | undefined): string | null {
    let v = String(raw ?? "").trim();
    if (!v) return null;
    v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "").replace(/^@/, "");
    return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v.toLowerCase() : null;
}

// Giveaway window, in Eastern time (the HQ's clock), not the server's UTC.
function easternDate(d: Date): string {
    return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD
}

export function giveawayStatus(g: Giveaway, now = new Date()): "upcoming" | "open" | "closed" {
    const today = easternDate(now);
    if (today < g.start) return "upcoming";
    if (today > g.end) return "closed";
    return "open";
}

/** True when an entry made at `at` counts for the draw. */
export function enteredInWindow(g: Giveaway, at: Date | null): boolean {
    if (!at) return false;
    const d = easternDate(at);
    return d >= g.start && d <= g.end;
}

export function formatDay(ymd: string): string {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}
