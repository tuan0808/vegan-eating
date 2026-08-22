// src/lib/band-config.ts
//
// Editable copy + rotating videos for the home-page "join" band (JoinBand at the
// foot of the home page). Stored in the Setting KV table — no schema migration.
// Read on the home page; written from the admin "Newsletter videos" tab via
// src/lib/actions/band.ts. A missing key falls back to the current hardcoded copy.
import { prisma } from "./prisma";

const K_HEADING = "band.heading";
const K_BODY = "band.body";
const K_PLACEHOLDER = "band.form_placeholder";
const K_BUTTON = "band.form_button";
const K_SUCCESS = "band.form_success";
const K_VIDEOS = "band.videos"; // JSON-encoded string[]

export const BAND_DEFAULTS = {
    heading: "A kitchen full of people, not a wall of instructions.",
    body: "Create a free account to save recipes, rate what you cook, swap tips in the forum, and follow your favourite contributors. Plus one tested recipe in your inbox each Sunday.",
    placeholder: "Just want the newsletter? Drop your email",
    button: "Sign up",
    success: "Thanks — you're on the list. A tested recipe lands each Sunday.",
    videos: ["/media/veganeating.mp4"],
};

export type BandConfig = {
    heading: string;
    body: string;
    placeholder: string;
    button: string;
    success: string;
    videos: string[];
};

export async function getBandConfig(): Promise<BandConfig> {
    const keys = [K_HEADING, K_BODY, K_PLACEHOLDER, K_BUTTON, K_SUCCESS, K_VIDEOS];
    let map: Record<string, string> = {};
    try {
        const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
        map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    } catch {
        // DB unreachable — serve defaults below.
    }

    let videos = BAND_DEFAULTS.videos;
    if (map[K_VIDEOS]) {
        try {
            const parsed = JSON.parse(map[K_VIDEOS]);
            if (Array.isArray(parsed)) videos = parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
        } catch {
            // keep default
        }
    }

    return {
        heading: map[K_HEADING] ?? BAND_DEFAULTS.heading,
        body: map[K_BODY] ?? BAND_DEFAULTS.body,
        placeholder: map[K_PLACEHOLDER] ?? BAND_DEFAULTS.placeholder,
        button: map[K_BUTTON] ?? BAND_DEFAULTS.button,
        success: map[K_SUCCESS] ?? BAND_DEFAULTS.success,
        videos,
    };
}

/** Persist the band copy (all five text fields). */
export async function saveBandCopy(c: Omit<BandConfig, "videos">): Promise<void> {
    const pairs: [string, string][] = [
        [K_HEADING, c.heading],
        [K_BODY, c.body],
        [K_PLACEHOLDER, c.placeholder],
        [K_BUTTON, c.button],
        [K_SUCCESS, c.success],
    ];
    await prisma.$transaction(
        pairs.map(([key, value]) => prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })),
    );
}

/** Persist the rotating-video list. */
export async function saveBandVideos(videos: string[]): Promise<void> {
    const value = JSON.stringify(videos);
    await prisma.setting.upsert({ where: { key: K_VIDEOS }, update: { value }, create: { key: K_VIDEOS, value } });
}
