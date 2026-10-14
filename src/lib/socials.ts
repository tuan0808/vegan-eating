// src/lib/socials.ts
//
// Admin-managed social profile links (shown on /links), persisted as JSON in the
// Setting KV store — no schema migration. Each entry is { url, hidden }; hidden
// links stay in the admin list but are left off /links and the footer. Older
// saves were a plain string[] and still read fine. Until an admin saves the list
// for the first time, it falls back to the Instagram account.
import { getSetting, setSetting } from "./settings";
import { IG_HANDLE } from "./instagram";

const KEY = "socials.links";
export const MAX_SOCIALS = 30;

export type SocialEntry = { url: string; hidden: boolean };

/** Every saved link, hidden ones included — for the admin editor. */
export async function getSocialEntries(): Promise<SocialEntry[]> {
    const value = await getSetting(KEY);
    if (value === null) return [{ url: `https://instagram.com/${IG_HANDLE}`, hidden: false }];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.flatMap((e): SocialEntry[] => {
                if (typeof e === "string") return [{ url: e, hidden: false }];
                if (e && typeof e.url === "string") return [{ url: e.url, hidden: e.hidden === true }];
                return [];
            });
        }
    } catch {
        /* corrupt value — treat as empty rather than crash /links */
    }
    return [];
}

/** The links to show publicly (hidden ones dropped). */
export async function getSocials(): Promise<string[]> {
    return (await getSocialEntries()).filter((e) => !e.hidden).map((e) => e.url);
}

export async function saveSocials(entries: SocialEntry[]): Promise<void> {
    await setSetting(KEY, JSON.stringify(entries));
}
