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

// Fetches the current vegan/vegetarian feed and upserts each story into the
// NewsArticle table. Safe to run repeatedly — upsert on externalId means the
// hourly cron never creates duplicates, it just refreshes mutable fields.
export async function syncNews(): Promise<{ fetched: number; saved: number }> {
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

    let saved = 0;
    for (const a of data.results) {
        if (!a.article_id || !a.title || !a.link) continue;

        const parsed = a.pubDate ? new Date(a.pubDate.replace(" ", "T")) : new Date();
        const pubDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
        const categories = Array.isArray(a.category) ? a.category : [];

        await prisma.newsArticle.upsert({
            where: { externalId: a.article_id },
            create: {
                externalId: a.article_id,
                // suffix keeps the slug unique even if two stories share a title
                slug: `${slugify(a.title)}-${a.article_id.slice(-6)}`,
                title: a.title,
                description: a.description ?? "",
                link: a.link,
                image: a.image_url,
                source: a.source_name ?? a.source_id ?? "",
                pubDate,
                categories: JSON.stringify(categories),
                content: a.content ?? "",
            },
            update: {
                // refresh mutable bits on re-sync; leave slug/externalId/pubDate stable
                description: a.description ?? "",
                image: a.image_url,
                source: a.source_name ?? a.source_id ?? "",
                categories: JSON.stringify(categories),
                content: a.content ?? "",
            },
        });
        saved++;
    }

    return { fetched: data.results.length, saved };
}