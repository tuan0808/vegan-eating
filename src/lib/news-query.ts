// src/lib/news-query.ts
// Single source of truth for the newsdata.io query. The query lives in the
// Setting table (key below) so it can be edited from the admin UI with no rebuild.
// The API key is NEVER stored here — it's always injected from NEWSDATA_API_KEY
// at fetch time, and stripped from any pasted input.
import { prisma } from "@/lib/prisma";

export const NEWS_ENDPOINT = "https://newsdata.io/api/1/latest";
export const NEWS_QUERY_SETTING_KEY = "news.queryString";

// Built-in default. excludefield keeps `link` + `source_*` (the /news pages need
// the original link and the source byline) and only drops fields the app ignores.
// Stored in canonical form: literal spaces and literal commas (readable in the
// textarea); encoding happens at fetch time in buildNewsUrl.
export const DEFAULT_NEWS_QUERY = [
    "q=vegan and vegetarian recipes",
    "country=us",
    "language=en",
    "category=food,health,lifestyle",
    "full_content=1",
    "image=1",
    "removeduplicate=1",
    "excludefield=source_url,source_icon,source_priority,creator",
].join("&");

// Params we refuse to take from user input — the key must come from the env only.
const STRIPPED_PARAMS = ["apikey"];

// Encode a value for the URL, but keep commas LITERAL. newsdata treats a
// percent-encoded comma (%2C) in `category`/`excludefield` as one bogus value and
// returns nothing, so we must not encode them — this matches a working curl call.
function encVal(v: string): string {
    return encodeURIComponent(v).replace(/%2C/gi, ",");
}

/**
 * Normalise pasted input into a clean, canonical query string we can store.
 * Accepts either the full URL or just the params, tolerates newsdata's indented
 * multi-line "&param" docs format, preserves spaces inside values (e.g. the q=
 * phrase), strips the apikey, and decodes values so the stored form is readable
 * (literal commas, not %2C).
 */
export function parseNewsQueryInput(raw: string): string {
    let text = (raw || "").trim();

    // If a full URL was pasted, keep only what's after the first '?'.
    const qIndex = text.indexOf("?");
    if (/^https?:\/\//i.test(text) && qIndex !== -1) text = text.slice(qIndex + 1);

    // Join lines, trimming each (removes indentation/newlines) but preserving
    // spaces inside values.
    text = text
        .split(/\r?\n/)
        .map((s) => s.trim())
        .join("")
        .replace(/^&+/, "");

    const sp = new URLSearchParams(text); // entries() returns DECODED values
    for (const p of STRIPPED_PARAMS) sp.delete(p);

    const pairs: string[] = [];
    for (const [k, v] of Array.from(sp.entries())) {
        if (!k) continue;
        pairs.push(`${k}=${v}`); // literal/decoded — comma-safe and readable
    }
    return pairs.join("&");
}

/** The stored query string, or the built-in default if none is saved. */
export async function getNewsQueryString(): Promise<string> {
    try {
        const row = await prisma.setting.findUnique({ where: { key: NEWS_QUERY_SETTING_KEY } });
        const v = row?.value?.trim();
        return v && v.length ? v : DEFAULT_NEWS_QUERY;
    } catch {
        return DEFAULT_NEWS_QUERY;
    }
}

/**
 * Build the full request URL. apiKey is always injected here; `extra` is for
 * per-request params the caller adds (e.g. { page } for pagination). Commas are
 * kept literal; everything else is properly encoded. Robust to a stored value
 * that came in either encoded or literal — URLSearchParams decodes on parse, then
 * we re-encode with encVal.
 */
export function buildNewsUrl(
    apiKey: string,
    queryString: string,
    extra: Record<string, string> = {},
): string {
    const sp = new URLSearchParams(queryString);
    sp.delete("apikey"); // never trust a key from the stored string

    const pairs: string[] = [`apikey=${encodeURIComponent(apiKey)}`];
    for (const [k, v] of Array.from(sp.entries())) {
        pairs.push(`${encodeURIComponent(k)}=${encVal(v)}`);
    }
    for (const [k, v] of Object.entries(extra)) {
        pairs.push(`${encodeURIComponent(k)}=${encVal(String(v))}`);
    }
    return `${NEWS_ENDPOINT}?${pairs.join("&")}`;
}