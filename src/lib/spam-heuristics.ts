// src/lib/spam-heuristics.ts
// Pure, dependency-free content heuristics. No DB, no headers — easy to reason
// about and test. The guard composes these with the user's trust state.

/** Strip tags + entities down to comparable plain text. */
export function toText(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Count links in a post body: both real anchors (<a href>) and bare URLs pasted
 * as plain text. Bots love stuffing links; this is the signal.
 */
export function countLinks(html: string): number {
    const anchors = (html.match(/<a\s[^>]*href=/gi) || []).length;
    const text = toText(html);
    const bare = (text.match(/\bhttps?:\/\/[^\s)]+/gi) || []).length;
    // A linked URL shows up in both; take the larger rather than double-counting.
    return Math.max(anchors, bare);
}

function normalize(html: string): string {
    return toText(html)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "") // drop punctuation/symbols (ASCII-fold)
        .replace(/\s+/g, " ")
        .trim();
}

function wordSet(s: string): Set<string> {
    return new Set(s.split(" ").filter(Boolean));
}

/**
 * Near-duplicate check: catches a bot reposting the same (or barely-tweaked)
 * message. Exact match after normalization, or high word-overlap (Jaccard).
 * Returns false for very short bodies — "thanks!" twice isn't spam.
 */
export function isNearDuplicate(a: string, b: string, threshold = 0.9): boolean {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length < 12 || nb.length < 12) return false; // too short to judge

    const sa = wordSet(na);
    const sb = wordSet(nb);
    if (sa.size < 3 || sb.size < 3) return na === nb;

    let inter = 0;
    sa.forEach((w) => {
        if (sb.has(w)) inter += 1;
    });
    const union = sa.size + sb.size - inter;
    const jaccard = union === 0 ? 0 : inter / union;
    return jaccard >= threshold;
}

/** Account age in ms. */
export function accountAgeMs(createdAt: Date, now = Date.now()): number {
    return now - createdAt.getTime();
}