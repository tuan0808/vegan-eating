// src/lib/news-xlsx.ts
//
// Single source of truth for the news spreadsheet schema (export + import),
// mirroring article-xlsx.ts.
//
// `content` is intentionally excluded: it's the full synced article body — far too
// large for a cell, and the hourly sync owns it. Editable-but-sync-managed fields
// (source, image, categories, description) round-trip, but the sync will refresh
// them on its next run; durable edits are title, pubDate, sort, hidden.
import { slugify } from "@/lib/recipe-filters";

export const COLUMNS = ["slug", "externalId", "title", "source", "link", "pubDate", "image", "categories", "description", "sort", "hidden"] as const;
export type Col = (typeof COLUMNS)[number];

const PIPE = " | ";
const PIPE_SPLIT = /\s*\|\s*/;

function jsonArr(s: string | null | undefined): string[] {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

export function cellValue(v: unknown): string | number | boolean | null {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.text === "string") return o.text;
        if (o.result !== undefined) return o.result as string | number | boolean;
        if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
        return String(v);
    }
    return v as string | number | boolean;
}

const cellStr = (v: unknown): string => String(cellValue(v) ?? "").trim();
const cellInt = (v: unknown): number | null => {
    const s = cellStr(v);
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : null;
};
const cellBool = (v: unknown): boolean => {
    const raw = cellValue(v);
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "number") return raw !== 0;
    return /^(true|1|yes|y)$/i.test(String(raw).trim());
};

// DB row -> spreadsheet row. pubDate is written as an ISO string so it round-trips cleanly.
export function newsToRow(a: Record<string, unknown>): Record<Col, string | number | boolean | null> {
    const pub = a.pubDate instanceof Date ? a.pubDate.toISOString() : String(a.pubDate ?? "");
    return {
        slug: (a.slug as string) ?? "",
        externalId: (a.externalId as string) ?? "",
        title: (a.title as string) ?? "",
        source: (a.source as string) ?? "",
        link: (a.link as string) ?? "",
        pubDate: pub,
        image: (a.image as string) ?? "",
        categories: jsonArr(a.categories as string).join(PIPE),
        description: (a.description as string) ?? "",
        sort: (a.sort as number) ?? null,
        hidden: !!a.hidden,
    };
}

export type NewsData = {
    slug: string;
    externalId: string;
    title: string;
    source: string;
    link: string;
    pubDate: Date;
    image: string | null;
    categories: string; // JSON array string
    description: string;
    hidden: boolean;
};

export function rowToData(row: Record<string, unknown>): { slug: string; title: string; sort: number | null; data: NewsData } {
    const title = cellStr(row.title);
    let slug = cellStr(row.slug);
    if (!slug) slug = slugify(title);

    const catText = cellStr(row.categories);
    const categories = catText ? catText.split(PIPE_SPLIT).map((c) => c.trim()).filter(Boolean) : [];

    // Parse the ISO string back to a Date; fall back to "now" only if unparseable
    // (a clean round-trip from export always parses).
    const pubStr = cellStr(row.pubDate);
    const parsed = pubStr ? new Date(pubStr) : null;
    const pubDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();

    const data: NewsData = {
        slug,
        externalId: cellStr(row.externalId),
        title,
        source: cellStr(row.source),
        link: cellStr(row.link),
        pubDate,
        image: cellStr(row.image) || null,
        categories: JSON.stringify(categories),
        description: cellStr(row.description),
        hidden: cellBool(row.hidden),
    };

    return { slug, title, sort: cellInt(row.sort), data };
}

export function isNewsChanged(existing: Record<string, unknown>, data: NewsData): boolean {
    const norm = (v: unknown) => {
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v.toISOString();
        return String(v);
    };
    const keys = Object.keys(data).filter((k) => k !== "slug") as (keyof NewsData)[];
    return keys.some((k) => {
        if (k === "pubDate") {
            const ex = existing.pubDate instanceof Date ? existing.pubDate.toISOString() : norm(existing.pubDate);
            return ex !== (data.pubDate as Date).toISOString();
        }
        return norm(existing[k]) !== norm(data[k]);
    });
}