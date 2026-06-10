// src/lib/article-xlsx.ts
//
// Single source of truth for the article spreadsheet schema (export + import).
import { slugify } from "@/lib/recipe-filters";

export const COLUMNS = ["slug", "sourceUrl", "title", "date", "image", "body", "sort", "hidden"] as const;
export type Col = (typeof COLUMNS)[number];

const PARA_SPLIT = /\n\s*\n/; // blank line separates paragraphs

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

// DB row -> spreadsheet row. Paragraphs are separated by a blank line in the cell.
export function articleToRow(a: Record<string, unknown>): Record<Col, string | number | boolean | null> {
    return {
        slug: (a.slug as string) ?? "",
        sourceUrl: (a.sourceUrl as string) ?? "",
        title: (a.title as string) ?? "",
        date: (a.date as string) ?? "",
        image: (a.image as string) ?? "",
        body: jsonArr(a.body as string).join("\n\n"),
        sort: (a.sort as number) ?? null,
        hidden: !!a.hidden,
    };
}

export type ArticleData = {
    slug: string;
    sourceUrl: string;
    title: string;
    date: string;
    image: string | null;
    body: string; // JSON array of paragraphs
    hidden: boolean;
};

export function rowToData(row: Record<string, unknown>): { slug: string; title: string; sort: number | null; data: ArticleData } {
    const title = cellStr(row.title);
    let slug = cellStr(row.slug);
    if (!slug) slug = slugify(title);

    const bodyText = cellStr(row.body);
    const paragraphs = bodyText ? bodyText.split(PARA_SPLIT).map((p) => p.trim()).filter(Boolean) : [];

    const data: ArticleData = {
        slug,
        sourceUrl: cellStr(row.sourceUrl),
        title,
        date: cellStr(row.date),
        image: cellStr(row.image) || null,
        body: JSON.stringify(paragraphs),
        hidden: cellBool(row.hidden),
    };

    return { slug, title, sort: cellInt(row.sort), data };
}

export function isArticleChanged(existing: Record<string, unknown>, data: ArticleData): boolean {
    const norm = (v: unknown) => (v === null || v === undefined ? "" : String(v));
    const keys = Object.keys(data).filter((k) => k !== "slug") as (keyof ArticleData)[];
    return keys.some((k) => norm(existing[k]) !== norm(data[k]));
}