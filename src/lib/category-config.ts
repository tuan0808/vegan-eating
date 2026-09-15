// src/lib/category-config.ts
//
// Admin-managed collection config, persisted as JSON in the Setting KV store
// (no schema migration). Falls back to DEFAULT_CATEGORIES when unset.
//
// NB: this is the homepage-cards / filter-pills / bulk-tool config. The recipe
// EDIT dropdown taxonomy lives in ./categories.ts and is separate.
import { cache } from "react";
import { prisma } from "./prisma";
import { DEFAULT_CATEGORIES, type Category } from "./categorize";

const KEY = "categories.config";

// Cached per request so cards + pills + filters share one read.
export const getCategories = cache(async (): Promise<Category[]> => {
    const row = await prisma.setting.findUnique({ where: { key: KEY } });
    if (!row?.value) return DEFAULT_CATEGORIES;
    try {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed) && parsed.length) return parsed as Category[];
    } catch {
        /* fall through to defaults on a corrupt value */
    }
    return DEFAULT_CATEGORIES;
});

export async function saveCategories(cats: Category[]): Promise<void> {
    const value = JSON.stringify(cats);
    await prisma.setting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
}

// Homepage "Cook by collection" cards, in order.
export async function homeCollections(): Promise<Category[]> {
    return (await getCategories()).filter((c) => c.showOnHome).sort((a, b) => a.order - b.order);
}

// Filter pills for /recipes + admin — always "All" first, then opted-in categories.
export async function pillCategories(): Promise<{ label: string; slug: string }[]> {
    const cats = (await getCategories()).filter((c) => c.showAsPill).sort((a, b) => a.order - b.order);
    return [{ label: "All", slug: "all" }, ...cats.map((c) => ({ label: c.label, slug: c.slug }))];
}

// Assignable taxonomy for the recipe editor's Category dropdown (full editor,
// quick-edit row, and the New recipe form).
//
// Deliberately NOT pillCategories(): a collection is assignable whether or not
// it's opted into the pill row, and "All" isn't a real category. `dynamic`
// collections (Weeknight in 30) are computed from readyIn rather than stored on
// the recipe, so they can't be picked either.
export async function recipeCategoryOptions(): Promise<{ value: string; label: string }[]> {
    return (await getCategories())
        .filter((c) => !c.dynamic && c.slug !== "all")
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ value: c.slug, label: c.label }));
}
