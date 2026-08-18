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
//
// TOKEN LIFECYCLE. An IG long-lived token lasts 60 days and must be refreshed
// while still valid (>=24h old, <60d) to get a fresh 60-day one. The env token
// is only the SEED: env vars are immutable at runtime on DO App Platform, so a
// refreshed token can't be written back to the env. Instead we persist the
// rotated token in the Setting KV table and always prefer that copy. Refresh
// happens two ways: lazily on read (recentInstagram fires a throttled
// background refresh as the token nears expiry) and on demand via the
// CRON_SECRET-guarded /api/instagram/refresh route.

import { prisma } from "@/lib/prisma";

const ENV_TOKEN = process.env.IG_ACCESS_TOKEN;
const USER_ID = process.env.IG_USER_ID;
const HASHTAG_ID = process.env.IG_HASHTAG_ID;

// Setting KV keys for the rotated token (no schema migration — reuses Setting).
const K_TOKEN = "ig.access_token";
const K_EXPIRES = "ig.token_expires_at"; // ISO string
const K_REFRESHED = "ig.refreshed_at"; // ISO string
// Last-good posts, so a transient/timed-out live fetch (e.g. the first request
// after a deploy restarts the server) doesn't blank the whole section.
const K_POSTS = "ig.posts_cache"; // JSON-encoded IgPost[]

// Refresh once the stored token is within this window of its expiry.
const REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
// IG rejects a refresh on a token younger than 24h; skip until then.
const MIN_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;
// In-process throttle so lazy reads never hammer the refresh endpoint.
const REFRESH_ATTEMPT_INTERVAL_MS = 60 * 60 * 1000; // 1h

// Public handle + hashtag shown in the UI (safe to hardcode; not secrets).
export const IG_HANDLE = process.env.NEXT_PUBLIC_IG_HANDLE || "VeganEating_Com";
export const IG_HASHTAG = process.env.NEXT_PUBLIC_IG_HASHTAG || "VeganEating";

const GRAPH = "https://graph.instagram.com";
const FACEBOOK_GRAPH = "https://graph.facebook.com/v21.0";
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3500;
// The media fetch gets a longer budget than the token refresh: the first
// outbound call on a cold container can be slow, and timing out here would
// hide the whole section.
const MEDIA_FETCH_TIMEOUT_MS = 8000;

export type IgPost = {
    id: string;
    permalink: string;
    imageUrl: string;
    caption: string;
    isVideo: boolean;
};

/**
 * Route an IG CDN image through our own origin (see /api/instagram/image).
 * Instagram 403s hotlinked images and its signed URLs expire in the browser;
 * proxying server-side sidesteps both. Non-IG/empty urls are returned as-is.
 */
export function proxiedIgImage(url: string): string {
    if (!url) return url;
    return `/api/instagram/image?u=${encodeURIComponent(url)}`;
}

export function instagramEnabled(): boolean {
    // Env token is always the seed, so a sync env check is enough to decide
    // whether to render. The live fetch below prefers the rotated DB copy.
    return Boolean(ENV_TOKEN && (USER_ID || HASHTAG_ID));
}

type TokenState = { token: string; expiresAt: number | null; refreshedAt: number | null; fromDb: boolean };

/** Current token: the rotated copy in Setting if present, else the env seed. */
async function loadTokenState(): Promise<TokenState | null> {
    try {
        const rows = await prisma.setting.findMany({ where: { key: { in: [K_TOKEN, K_EXPIRES, K_REFRESHED] } } });
        const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
        if (map[K_TOKEN]) {
            const expiresAt = map[K_EXPIRES] ? Date.parse(map[K_EXPIRES]) : NaN;
            const refreshedAt = map[K_REFRESHED] ? Date.parse(map[K_REFRESHED]) : NaN;
            return {
                token: map[K_TOKEN],
                expiresAt: Number.isNaN(expiresAt) ? null : expiresAt,
                refreshedAt: Number.isNaN(refreshedAt) ? null : refreshedAt,
                fromDb: true,
            };
        }
    } catch {
        // DB unreachable — fall back to the env seed below.
    }
    return ENV_TOKEN ? { token: ENV_TOKEN, expiresAt: null, refreshedAt: null, fromDb: false } : null;
}

export type RefreshResult = {
    ok: boolean;
    refreshed: boolean;
    reason?: string;
    expiresAt?: string;
    // Meta's raw error on an http-* failure — names the real cause (invalid
    // token vs. revoked vs. checkpoint) instead of a bare status code.
    detail?: { message?: string; code?: number; subcode?: number; type?: string };
};

let lastRefreshAttempt = 0;
let refreshInFlight: Promise<RefreshResult> | null = null;

/**
 * Exchange the current long-lived token for a fresh 60-day one and persist it.
 * Skips (without calling the API) unless the token is nearing expiry, unless
 * `force` is set — the cron route forces, lazy reads don't. Safe to call often:
 * concurrent calls share one in-flight request.
 */
export async function refreshInstagramToken(opts: { force?: boolean } = {}): Promise<RefreshResult> {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = doRefresh(opts).finally(() => {
        refreshInFlight = null;
    });
    return refreshInFlight;
}

async function doRefresh(opts: { force?: boolean }): Promise<RefreshResult> {
    const state = await loadTokenState();
    if (!state) return { ok: false, refreshed: false, reason: "no-token" };

    const now = Date.now();
    if (!opts.force) {
        // Due when we don't yet know the expiry (still on the env seed — refresh
        // once to establish a tracked expiry) or when inside the renewal window.
        const due = state.expiresAt == null || state.expiresAt - now < REFRESH_WINDOW_MS;
        if (!due) return { ok: true, refreshed: false, reason: "not-due" };
        // Respect IG's 24h minimum age when we can tell from our own records.
        if (state.refreshedAt != null && now - state.refreshedAt < MIN_TOKEN_AGE_MS) {
            return { ok: true, refreshed: false, reason: "too-young" };
        }
    }

    const url = `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${state.token}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let json: { access_token?: string; expires_in?: number } | null = null;
    try {
        const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) {
            // Pull Meta's error body so the caller sees the real cause (code 190
            // = invalid/expired/revoked token, subcode distinguishes why).
            const err = await res.json().catch(() => null);
            const e = err?.error;
            return {
                ok: false,
                refreshed: false,
                reason: `http-${res.status}`,
                detail: e ? { message: e.message, code: e.code, subcode: e.error_subcode, type: e.type } : undefined,
            };
        }
        json = await res.json();
    } catch {
        return { ok: false, refreshed: false, reason: "fetch-failed" };
    } finally {
        clearTimeout(timer);
    }
    if (!json?.access_token) return { ok: false, refreshed: false, reason: "no-token-in-response" };

    // expires_in is seconds from now; default to 60 days if the field is missing.
    const ttlMs = (json.expires_in ?? 60 * 24 * 60 * 60) * 1000;
    const expiresAt = new Date(now + ttlMs).toISOString();
    const refreshedAt = new Date(now).toISOString();
    try {
        await prisma.$transaction([
            prisma.setting.upsert({ where: { key: K_TOKEN }, update: { value: json.access_token }, create: { key: K_TOKEN, value: json.access_token } }),
            prisma.setting.upsert({ where: { key: K_EXPIRES }, update: { value: expiresAt }, create: { key: K_EXPIRES, value: expiresAt } }),
            prisma.setting.upsert({ where: { key: K_REFRESHED }, update: { value: refreshedAt }, create: { key: K_REFRESHED, value: refreshedAt } }),
        ]);
    } catch {
        return { ok: false, refreshed: false, reason: "persist-failed" };
    }
    return { ok: true, refreshed: true, expiresAt };
}

/** Fire a throttled background refresh; never blocks the caller. */
function kickBackgroundRefresh(): void {
    const now = Date.now();
    if (now - lastRefreshAttempt < REFRESH_ATTEMPT_INTERVAL_MS) return;
    lastRefreshAttempt = now;
    void refreshInstagramToken().catch(() => {});
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

async function fetchJson(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<{ data?: IgMedia[] } | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
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

/** Last-good posts persisted in the DB — the cold-start fallback. */
async function loadPersistedPosts(): Promise<IgPost[]> {
    try {
        const row = await prisma.setting.findUnique({ where: { key: K_POSTS } });
        if (!row?.value) return [];
        const parsed = JSON.parse(row.value);
        return Array.isArray(parsed) ? (parsed as IgPost[]) : [];
    } catch {
        return [];
    }
}

/** Persist the latest good posts so they survive a server restart. Best effort. */
async function persistPosts(posts: IgPost[]): Promise<void> {
    try {
        const value = JSON.stringify(posts);
        await prisma.setting.upsert({ where: { key: K_POSTS }, update: { value }, create: { key: K_POSTS, value } });
    } catch {
        // Non-fatal: the in-process cache still serves this process.
    }
}

/** Latest posts (own feed, or hashtag media when IG_HASHTAG_ID is set). Cached. */
export async function recentInstagram(limit = 8): Promise<IgPost[]> {
    if (!instagramEnabled()) return [];
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.posts.slice(0, limit);

    const state = await loadTokenState();
    // No token this process — fall back to whatever we last served.
    if (!state) return (cache?.posts ?? (await loadPersistedPosts())).slice(0, limit);
    // Keep the token alive while we're here — throttled, never blocks the render.
    kickBackgroundRefresh();
    const token = state.token;

    const fields = "id,media_type,media_url,thumbnail_url,permalink,caption";
    const url = HASHTAG_ID
        ? `${FACEBOOK_GRAPH}/${HASHTAG_ID}/recent_media?user_id=${USER_ID}&fields=${fields}&limit=${limit}&access_token=${token}`
        : `${GRAPH}/${USER_ID}/media?fields=${fields}&limit=${limit}&access_token=${token}`;

    const json = await fetchJson(url, MEDIA_FETCH_TIMEOUT_MS);
    // Live fetch failed/timed out — serve the in-process cache, else the last
    // good posts from the DB, so a blip never blanks the section.
    if (!json?.data) return (cache?.posts ?? (await loadPersistedPosts())).slice(0, limit);

    const posts = mapMedia(json.data);
    if (posts.length) {
        cache = { at: Date.now(), posts };
        void persistPosts(posts); // survive the next cold start
    }
    return posts.slice(0, limit);
}
