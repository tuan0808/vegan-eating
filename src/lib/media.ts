// src/lib/media.ts
const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/+$/, "");

/**
 * Resolve a stored/relative media path to a full URL.
 *
 *  - Absolute URLs (http/https, protocol-relative //, data:) pass through
 *    unchanged — so this stays correct even if the DB ever holds absolute URLs.
 *  - Relative paths ("/2024/vegor.png", "media/x.jpg") get prefixed with the
 *    Spaces/CDN base from NEXT_PUBLIC_MEDIA_BASE_URL.
 *  - If no base is configured (local dev still serving from /public), the path
 *    is returned as-is — so this is a no-op locally.
 *  - Falsy input returns "" so callers can pick a fallback.
 */
export function mediaUrl(path?: string | null): string {
    if (!path) return "";
    if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
    if (!BASE) return path;
    return `${BASE}/${path.replace(/^\/+/, "")}`;
}

/** Convenience for the JSON-string array columns (Recipe.gallery, RecipeSubmission.images). */
export function mediaUrls(paths: Array<string | null | undefined>): string[] {
    return paths.map(mediaUrl).filter(Boolean);
}