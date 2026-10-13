// src/lib/social-platforms.ts
//
// Recognises a social profile URL by its host so the admin only ever pastes a
// link — the label and icon follow from it. Pure (no React, no DB) so it runs
// in server actions, server pages and client components alike. The icon for
// each key lives in components/SocialIcon.tsx.

export type Platform = { key: string; label: string; hosts: string[] };

export const PLATFORMS: Platform[] = [
    { key: "instagram", label: "Instagram", hosts: ["instagram.com", "instagr.am"] },
    { key: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
    { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
    { key: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me"] },
    { key: "x", label: "X", hosts: ["x.com", "twitter.com"] },
    { key: "threads", label: "Threads", hosts: ["threads.net", "threads.com"] },
    { key: "pinterest", label: "Pinterest", hosts: ["pinterest.com", "pin.it"] },
    { key: "bluesky", label: "Bluesky", hosts: ["bsky.app"] },
    { key: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"] },
    { key: "reddit", label: "Reddit", hosts: ["reddit.com", "redd.it"] },
    { key: "snapchat", label: "Snapchat", hosts: ["snapchat.com"] },
    { key: "twitch", label: "Twitch", hosts: ["twitch.tv"] },
    { key: "discord", label: "Discord", hosts: ["discord.gg", "discord.com"] },
    { key: "whatsapp", label: "WhatsApp", hosts: ["whatsapp.com", "wa.me"] },
    { key: "telegram", label: "Telegram", hosts: ["t.me", "telegram.me", "telegram.org"] },
    { key: "spotify", label: "Spotify", hosts: ["spotify.com"] },
    { key: "patreon", label: "Patreon", hosts: ["patreon.com"] },
    { key: "substack", label: "Substack", hosts: ["substack.com"] },
    { key: "github", label: "GitHub", hosts: ["github.com"] },
];

const WEBSITE: Platform = { key: "website", label: "Website", hosts: [] };
const EMAIL: Platform = { key: "email", label: "Email", hosts: [] };

// Accepts what people actually paste ("instagram.com/foo", "@-less handles
// with a scheme", mailto:) and returns a canonical absolute URL, or null.
export function normalizeSocialUrl(input: string): string | null {
    const raw = input.trim();
    if (!raw) return null;
    if (/^mailto:/i.test(raw)) return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(raw) ? raw : null;
    if (/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(raw)) return `mailto:${raw}`;
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    try {
        const u = new URL(withScheme);
        if (u.protocol !== "https:" && u.protocol !== "http:") return null;
        if (!u.hostname.includes(".")) return null;
        return u.toString();
    } catch {
        return null;
    }
}

export function detectPlatform(url: string): Platform {
    if (/^mailto:/i.test(url)) return EMAIL;
    let host: string;
    try {
        host = new URL(url).hostname.toLowerCase().replace(/^www\.|^m\./, "");
    } catch {
        return WEBSITE;
    }
    return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? WEBSITE;
}
