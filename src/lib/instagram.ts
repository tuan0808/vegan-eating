// src/lib/instagram.ts
//
// Pulls recent posts from our own Instagram via the Instagram Graph API, so the
// home page can showcase the latest @VeganEating_Com posts (and, once a hashtag
// id is configured, tagged community posts).
//
// Configure with env — the section stays hidden until a token is present, the
// same degrade-to-nothing pattern as the Google photo feature:
//   IG_ACCESS_TOKEN   long-lived token for an IG Business/Creator account
//   IG_USER_ID        the IG user id the token belongs to (for own-feed media)
//   IG_HASHTAG_ID     optional: a hashtag node id to pull recent tagged media
//                     instead of our own feed (requires hashtag_search scope)
//
// Results are cached in-process for a few minutes so we don't hit the API's
// rate limit on every render; a failure returns [] and the section hides.

const TOKEN = process.env.IG_ACCESS_TOKEN;
const USER_ID = process.env.IG_USER_ID;
const HASHTAG_ID = process.env.IG_HASHTAG_ID;

// Public handle + hashtag shown in the UI (safe to hardcode; not secrets).
export const IG_HANDLE = process.env.NEXT_PUBLIC_IG_HANDLE || "VeganEating_Com";
export const IG_HASHTAG = process.env.NEXT_PUBLIC_IG_HASHTAG || "VeganEating";

const GRAPH = "https://graph.instagram.com";
const FACEBOOK_GRAPH = "https://graph.facebook.com/v21.0";
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3500;

export type IgPost = {
    id: string;
    permalink: string;
    imageUrl: string;
    caption: string;
    isVideo: boolean;
};

export function instagramEnabled(): boolean {
    return Boolean(TOKEN && (USER_ID || HASHTAG_ID));
}

type CacheEntry = { at: number; posts: IgPost[] };
let cache: CacheEntry | null = null;

type IgMedia = {
    id: string;
    media_type?: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    caption?: string;
};

function mapMedia(items: IgMedia[]): IgPost[] {
    return items
        .filter((m) => m.media_url || m.thumbnail_url)
        .map((m) => ({
            id: m.id,
            permalink: m.permalink ?? `https://instagram.com/${IG_HANDLE}`,
            // Videos expose a still via thumbnail_url; photos use media_url.
            imageUrl: (m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url) ?? m.media_url ?? m.thumbnail_url ?? "",
            caption: m.caption ?? "",
            isVideo: m.media_type === "VIDEO",
        }));
}

async function fetchJson(url: string): Promise<{ data?: IgMedia[] } | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as { data?: IgMedia[] };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/** Latest posts (own feed, or hashtag media when IG_HASHTAG_ID is set). Cached. */
export async function recentInstagram(limit = 8): Promise<IgPost[]> {
    if (!instagramEnabled()) return [];
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.posts.slice(0, limit);

    const fields = "id,media_type,media_url,thumbnail_url,permalink,caption";
    const url = HASHTAG_ID
        ? `${FACEBOOK_GRAPH}/${HASHTAG_ID}/recent_media?user_id=${USER_ID}&fields=${fields}&limit=${limit}&access_token=${TOKEN}`
        : `${GRAPH}/${USER_ID}/media?fields=${fields}&limit=${limit}&access_token=${TOKEN}`;

    const json = await fetchJson(url);
    if (!json?.data) return cache?.posts.slice(0, limit) ?? [];

    const posts = mapMedia(json.data);
    cache = { at: Date.now(), posts };
    return posts.slice(0, limit);
}
