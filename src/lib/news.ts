// lib/news.ts
// Server-side helper for the /news page. Pulls vegan + vegetarian stories
// from newsdata.io. Keep the key in .env as NEWSDATA_API_KEY — it must never
// reach the client, so only import this from server components / route handlers.
import { prisma } from "@/lib/prisma"; // ← adjust if your Prisma client lives elsewhere (e.g. @/lib/db)

const ENDPOINT = "https://newsdata.io/api/1/latest";

export type NewsItem = {
    id: string;
    title: string;
    link: string;
    description: string | null;
    image: string | null;
    source: string | null;
    pubDate: string | null;
    content: string | null;
};

type NewsDataArticle = {
    article_id: string;
    title: string;
    link: string;
    description: string | null;
    image_url: string | null;
    source_id: string | null;
    source_name: string | null;
    pubDate: string | null;
    content: string | null;
};

type NewsDataResponse = {
    status: string;
    results?: NewsDataArticle[];
    nextPage?: string | null;
    message?: string;
};

export async function getVeganNews(): Promise<NewsItem[]> {
    const apiKey = process.env.NEWSDATA_API_KEY;
    if (!apiKey) {
        console.error("[news] NEWSDATA_API_KEY is not set");
        return [];
    }

    const params = new URLSearchParams({
        apikey: apiKey,
        q: "vegan OR vegetarian", // UPPERCASE boolean; lowercase "and" is read as a literal search word
        country: "us",
        language: "en",
        category: "food,health,lifestyle",
        full_content: "1", // pull the full article body (Basic tier and up)
    });

    try {
        const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
            // One cached copy per hour, shared across all visitors. The free tier is
            // 200 credits/day — without this every page view would spend a credit.
            next: { revalidate: 3600 },
        });

        if (!res.ok) {
            console.error(`[news] newsdata.io returned HTTP ${res.status}`);
            return [];
        }

        const data: NewsDataResponse = await res.json();
        if (data.status !== "success" || !data.results) {
            console.error(`[news] unexpected payload: ${data.message ?? data.status}`);
            return [];
        }

        return data.results.map((a) => ({
            id: a.article_id,
            title: a.title,
            link: a.link,
            description: a.description,
            image: a.image_url,
            source: a.source_name ?? a.source_id,
            pubDate: a.pubDate,
            content: a.content,
        }));
    } catch (err) {
        console.error("[news] fetch failed", err);
        return [];
    }
}

// ───────────────────────── DB-backed reads (the stored backlog) ─────────────────────────
// The sync writes NewsArticle rows; these power the /news pages so reads cost no
// API credits and old stories stay at permanent URLs.

export type StoredNews = {
    id: string;
    slug: string;
    title: string;
    description: string;
    link: string;
    image: string | null;
    source: string;
    pubDate: Date;
    categories: string[];
    content: string;
};

export type NewsCard = {
    slug: string;
    title: string;
    date: string;
    image: string | null;
};

function parseCategories(json: string): string[] {
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
        return [];
    }
}

function fmtDate(d: Date): string {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Guard the slug — a `findUnique` called with undefined panics the query engine.
export async function getNewsArticleBySlug(slug?: string | null): Promise<StoredNews | null> {
    if (!slug) return null;
    const row = await prisma.newsArticle.findUnique({ where: { slug } });
    if (!row || row.hidden) return null;
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        link: row.link,
        image: row.image,
        source: row.source,
        pubDate: row.pubDate,
        categories: parseCategories(row.categories),
        content: row.content,
    };
}

export async function listRelatedNews(
    categories: string[],
    excludeSlug: string,
    n = 4,
): Promise<NewsCard[]> {
    const rows = await prisma.newsArticle.findMany({
        where: {
            hidden: false,
            slug: { not: excludeSlug },
            ...(categories.length
                ? { OR: categories.map((c) => ({ categories: { contains: `"${c}"` } })) }
                : {}),
        },
        orderBy: { pubDate: "desc" },
        take: n,
    });
    return rows.map((r) => ({ slug: r.slug, title: r.title, date: fmtDate(r.pubDate), image: r.image }));
}

export async function listLatestNews(excludeSlug = "", n = 5): Promise<NewsCard[]> {
    const rows = await prisma.newsArticle.findMany({
        where: { hidden: false, ...(excludeSlug ? { slug: { not: excludeSlug } } : {}) },
        orderBy: { pubDate: "desc" },
        take: n,
    });
    return rows.map((r) => ({ slug: r.slug, title: r.title, date: fmtDate(r.pubDate), image: r.image }));
}

// Richer feed for the /news Dispatch front page (lead + stories + brief).
export type NewsFeedItem = {
    slug: string;
    title: string;
    description: string;
    image: string | null;
    source: string;
    date: string; // long form, for the lead/stories byline
    dateShort: string; // short form, for the "In brief" list
    categories: string[];
};

export async function getNewsFeed(n = 10): Promise<NewsFeedItem[]> {
    const rows = await prisma.newsArticle.findMany({
        where: { hidden: false },
        orderBy: { pubDate: "desc" },
        take: n,
    });
    return rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        description: r.description,
        image: r.image,
        source: r.source,
        date: r.pubDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        dateShort: r.pubDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        categories: parseCategories(r.categories),
    }));
}