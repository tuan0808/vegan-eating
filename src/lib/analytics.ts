// src/lib/analytics.ts
//
// First-party traffic analytics. The /api/track beacon writes PageView rows;
// the admin dashboard reads the aggregations below. All grouping-by-day uses
// raw SQL (Postgres date_trunc) since Prisma's groupBy can't bucket dates.
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type Source = "search" | "social" | "referral" | "direct" | "internal";

// Hosts we treat as search engines / social networks. Substring match against
// the referrer hostname, so "www.google.co.uk" and "news.google.com" both hit.
const SEARCH_HOSTS = [
    "google.", "bing.com", "duckduckgo.com", "yahoo.", "yandex.", "ecosia.org",
    "baidu.com", "brave.com", "search.", "startpage.com", "qwant.com",
];
const SOCIAL_HOSTS = [
    "facebook.com", "fb.com", "instagram.com", "t.co", "twitter.com", "x.com",
    "pinterest.", "reddit.com", "linkedin.com", "youtube.com", "tiktok.com",
    "threads.net", "whatsapp.com", "telegram.", "mastodon.",
];

// Classify a raw referrer into a traffic source, given our own host so internal
// navigations don't masquerade as "referral".
export function classifySource(referrer: string | null | undefined, selfHost: string): Source {
    if (!referrer) return "direct";
    let host: string;
    try {
        host = new URL(referrer).hostname.toLowerCase();
    } catch {
        return "direct";
    }
    if (selfHost && host === selfHost.toLowerCase()) return "internal";
    if (SEARCH_HOSTS.some((h) => host.includes(h))) return "search";
    if (SOCIAL_HOSTS.some((h) => host.includes(h))) return "social";
    return "referral";
}

// Bare hostname of a referrer, for the "top referrers" list. Null if unparseable.
export function referrerHost(referrer: string | null | undefined): string | null {
    if (!referrer) return null;
    try {
        return new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return null;
    }
}

// Crude UA bot filter — most headless crawlers either don't run our beacon JS
// or self-identify here. Not exhaustive; just keeps the obvious noise out.
const BOT_RE = /bot|crawl|spider|slurp|crawler|bingpreview|headless|lighthouse|pingdom|gtmetrix|prerender|facebookexternalhit|embedly|whatsapp|telegram|preview|monitor|scan|curl|wget|python-requests|axios|node-fetch/i;
export function isBot(ua: string | null | undefined): boolean {
    if (!ua) return true; // no UA at all → almost certainly automated
    return BOT_RE.test(ua);
}

// Cookieless daily visitor id: hash(salt + day + ip + ua). Rotates each day so
// it can't track a person across days, and stores no raw IP/UA — privacy-safe
// uniques in the spirit of Plausible/Umami.
export function visitorHash(ip: string, ua: string, day: string): string {
    const salt = process.env.ANALYTICS_SALT || process.env.NEXTAUTH_SECRET || "va-analytics";
    return createHash("sha256").update(`${salt}|${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

// Map a pathname to a content kind + slug for per-type reporting.
export function classifyPath(path: string): { kind: string; slug: string | null } {
    const m = path.match(/^\/(recipes|articles|news)\/([^/]+)\/?$/);
    if (m) {
        const kind = m[1] === "recipes" ? "recipe" : m[1] === "articles" ? "article" : "news";
        return { kind, slug: decodeURIComponent(m[2]) };
    }
    return { kind: "page", slug: null };
}

// ---- read side (dashboard aggregations) ------------------------------------

export type RangeDays = 7 | 30 | 90;

// UTC midnight `days` ago — the inclusive lower bound for a window.
function since(days: number): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - (days - 1));
    return d;
}

export type Kpis = {
    views: number;
    visitors: number;
    searchViews: number;
    searchShare: number; // 0..1 of non-internal views from search
    // Period-over-period change vs the immediately preceding window of equal length.
    viewsDelta: number | null; // fractional change, e.g. 0.25 = +25%; null if no prior data
};

export async function getKpis(days: RangeDays): Promise<Kpis> {
    const start = since(days);
    const prevStart = since(days * 2);

    const [views, visitorRows, searchViews, prevViews, nonInternal] = await Promise.all([
        prisma.pageView.count({ where: { createdAt: { gte: start } } }),
        prisma.$queryRaw<{ c: bigint }[]>(Prisma.sql`
            SELECT count(DISTINCT "visitor") AS c FROM "PageView" WHERE "createdAt" >= ${start}
        `),
        prisma.pageView.count({ where: { createdAt: { gte: start }, source: "search" } }),
        prisma.pageView.count({ where: { createdAt: { gte: prevStart, lt: start } } }),
        prisma.pageView.count({ where: { createdAt: { gte: start }, source: { not: "internal" } } }),
    ]);

    return {
        views,
        visitors: Number(visitorRows[0]?.c ?? 0),
        searchViews,
        searchShare: nonInternal > 0 ? searchViews / nonInternal : 0,
        viewsDelta: prevViews > 0 ? (views - prevViews) / prevViews : null,
    };
}

export type DayPoint = { day: string; views: number; visitors: number };

// Daily views + unique visitors, zero-filled so the chart has no gaps.
export async function getTrafficOverTime(days: RangeDays): Promise<DayPoint[]> {
    const start = since(days);
    const rows = await prisma.$queryRaw<{ day: Date; views: bigint; visitors: bigint }[]>(Prisma.sql`
        SELECT date_trunc('day', "createdAt") AS day,
               count(*)                        AS views,
               count(DISTINCT "visitor")       AS visitors
        FROM "PageView"
        WHERE "createdAt" >= ${start}
        GROUP BY 1
        ORDER BY 1
    `);

    const byDay = new Map<string, { views: number; visitors: number }>();
    for (const r of rows) {
        byDay.set(r.day.toISOString().slice(0, 10), { views: Number(r.views), visitors: Number(r.visitors) });
    }
    const out: DayPoint[] = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + i);
        const key = d.toISOString().slice(0, 10);
        const hit = byDay.get(key);
        out.push({ day: key, views: hit?.views ?? 0, visitors: hit?.visitors ?? 0 });
    }
    return out;
}

export type SourceSlice = { source: Source; views: number };

export async function getSourceBreakdown(days: RangeDays): Promise<SourceSlice[]> {
    const start = since(days);
    const grouped = await prisma.pageView.groupBy({
        by: ["source"],
        where: { createdAt: { gte: start } },
        _count: { _all: true },
    });
    const order: Source[] = ["search", "social", "referral", "direct", "internal"];
    return order.map((source) => ({
        source,
        views: grouped.find((g) => g.source === source)?._count._all ?? 0,
    }));
}

export type ContentRow = { path: string; kind: string; slug: string | null; views: number; visitors: number };

// Top content by views, with unique visitors per page. Excludes nothing —
// includes static pages so you can see the homepage etc. too.
export async function getTopContent(days: RangeDays, limit = 15): Promise<ContentRow[]> {
    const start = since(days);
    const rows = await prisma.$queryRaw<
        { path: string; kind: string; slug: string | null; views: bigint; visitors: bigint }[]
    >(Prisma.sql`
        SELECT "path", "kind", "slug",
               count(*)                  AS views,
               count(DISTINCT "visitor") AS visitors
        FROM "PageView"
        WHERE "createdAt" >= ${start}
        GROUP BY "path", "kind", "slug"
        ORDER BY views DESC
        LIMIT ${limit}
    `);
    return rows.map((r) => ({
        path: r.path,
        kind: r.kind,
        slug: r.slug,
        views: Number(r.views),
        visitors: Number(r.visitors),
    }));
}

export type ReferrerRow = { host: string; views: number };

// Top external referrer hosts (excludes direct + internal).
export async function getTopReferrers(days: RangeDays, limit = 10): Promise<ReferrerRow[]> {
    const start = since(days);
    const rows = await prisma.pageView.findMany({
        where: { createdAt: { gte: start }, source: { in: ["search", "social", "referral"] }, referrer: { not: null } },
        select: { referrer: true },
    });
    const tally = new Map<string, number>();
    for (const r of rows) {
        const host = referrerHost(r.referrer);
        if (host) tally.set(host, (tally.get(host) ?? 0) + 1);
    }
    return Array.from(tally.entries())
        .map(([host, views]) => ({ host, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
}
