// src/lib/socials.ts
//
// Admin-managed social profile links (shown on /links), persisted as a JSON
// string[] in the Setting KV store — no schema migration. Until an admin saves
// the list for the first time, it falls back to the Instagram account.
import { getSetting, setSetting } from "./settings";
import { IG_HANDLE } from "./instagram";

const KEY = "socials.links";
export const MAX_SOCIALS = 30;

export async function getSocials(): Promise<string[]> {
    const value = await getSetting(KEY);
    if (value === null) return [`https://instagram.com/${IG_HANDLE}`];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === "string");
    } catch {
        /* corrupt value — treat as empty rather than crash /links */
    }
    return [];
}

export async function saveSocials(urls: string[]): Promise<void> {
    await setSetting(KEY, JSON.stringify(urls));
}
