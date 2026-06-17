// src/lib/news-sync.ts
import { prisma } from "@/lib/prisma"; // ← adjust if your Prisma client is exported elsewhere (e.g. @/lib/db)

const ENDPOINT = "https://newsdata.io/api/1/latest";

type RawArticle = {
    article_id: string;
    title: string | null;
    link: string;
    description: string | null;
    image_url: string | null;
    source_id: string | null;
    source_name: string | null;
    pubDate: string | null;
    category: string[] | null;
    content: string | null; // full body — only populated when full_content=1 is sent on a paid plan
};

type RawResponse = {
    status: string;
    results?: RawArticle[];
    message?: string;
};

function slugify(s: string) {
    const base = s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    return base || "story";
}

// Normalised title used as the duplicate key. Strips a trailing " - Outlet" /
// " | Outlet" tail (syndicated copies often append the publisher) and collapses
// everything else to lowercase words, so "Vegan diet study — CNN" and
// "Vegan diet study | The Guardian" hash to the same key.
function normTitle(s: string) {
    return s
        .toLowerCase()
        .replace(/\s+[-|–—]\s+[^-|–—]+$/, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

// Fetches the current vegan/vegetarian feed and upserts each story into the
// NewsArticle table. Safe to run repeatedly — upsert on externalId means the
// hourly cron never creates duplicate rows for the SAME article, it just
// refreshes mutable fields.
//
// Syndication dedup: different outlets republish the same wire story under
// different article_ids, so the upsert alone can't catch them. After loading
// the existing visible originals, any NEW story whose normalised title already
// exists is created hidden and stamped with `dupeOf` (the kept original's slug).
// The first occurrence of a title stays visible; the rest are flagged for staff
// review in the admin board. We only ever set hidden/dupeOf on CREATE, never on
// update, so a manual un-hide or "not a duplicate" decision is never reverted.
export async function syncNews(): Promise<{ fetched: number; saved: number; duplicates: number }> {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) throw new Error("NEWSDATA_API_KEY is not set");

    // Build the query string by hand. URLSearchParams percent-encodes the commas in
    // `category` to %2C, which newsdata reads as one bogus category and returns nothing.
    // Keeping the commas literal makes this request identical to one that works in curl.
    const query = [
        `apikey=${apiKey}`,
        `q=${encodeURIComponent("vegan OR vegetarian")}`,
        "country=us",
        "language=en",
        "category=food,health,lifestyle",
        "full_content=1",
    ].join("&");

    // The sync is the one place we deliberately hit the API fresh; pages read the DB.
    const res = await fetch(`${ENDPOINT}?${query}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`newsdata.io returned HTTP ${res.status}`);

    const data: RawResponse = await res.json();
    if (data.status !== "success" || !data.results) {
        throw new Error(`unexpected payload: ${data.message ?? data.status}`);
    }

    // Seed the dedup map from the currently-visible originals (not hidden, not
    // already flagged as a dupe). Map: normalised title -> that original's slug.
    const originals = await prisma.newsArticle.findMany({
        where: { hidden: false, dupeOf: null },
        select: { slug: true, title: true },
    });
    const seen = new Map<string, string>();
    for (const o of originals) {
        const k = normTitle(o.title);
        if (k && !seen.has(k)) seen.set(k, o.slug);
    }

    let saved = 0;
    let duplicates = 0;

    for (const a of data.results) {
        if (!a.article_id || !a.title || !a.link) continue;

        const parsed = a.pubDate ? new Date(a.pubDate.replace(" ", "T")) : new Date();
        const pubDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
        const categories = Array.isArray(a.category) ? a.category : [];

        const slug = `${slugify(a.title)}-${a.article_id.slice(-6)}`;
        const key = normTitle(a.title);
        const dupeOf = key && seen.has(key) ? seen.get(key)! : null;

        await prisma.newsArticle.upsert({
            where: { externalId: a.article_id },
            create: {
                externalId: a.article_id,
                slug,
                title: a.title,
                description: a.description ?? "",
                link: a.link,
                image: a.image_url,
                source: a.source_name ?? a.source_id ?? "",
                pubDate,
                categories: JSON.stringify(categories),
                content: a.content ?? "",
                // exact-title duplicate of an existing visible story → hide + flag for review
                hidden: dupeOf ? true : false,
                dupeOf,
            },
            update: {
                // refresh mutable bits on re-sync; leave slug/externalId/pubDate AND the
                // hidden/dupeOf moderation state stable so staff decisions persist.
                description: a.description ?? "",
                image: a.image_url,
                source: a.source_name ?? a.source_id ?? "",
                categories: JSON.stringify(categories),
                content: a.content ?? "",
            },
        });

        // The first story to claim a title becomes the canonical original; later
        // ones in this same batch will match against it and get flagged.
        if (key && !dupeOf && !seen.has(key)) seen.set(key, slug);
        if (dupeOf) duplicates++;
        saved++;
    }

    return { fetched: data.results.length, saved, duplicates };
}