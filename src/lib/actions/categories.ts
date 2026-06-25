"use server";
// src/lib/actions/categories.ts — admin category config + bulk categorize tool.
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { getCategories, saveCategories } from "@/lib/category-config";
import { scanRecipes, slugifyCategory, type Category, type ScanResult } from "@/lib/categorize";

export type SaveState = { ok: boolean; message: string | null; key?: number };

// --- save the whole category list (editor serialises it to a hidden field) ---
export async function saveCategoriesAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        return { ok: false, message: "You don't have permission to change this.", key: Date.now() };
    }

    let raw: unknown;
    try {
        raw = JSON.parse(String(formData.get("config") ?? "[]"));
    } catch {
        return { ok: false, message: "Could not read the category list.", key: Date.now() };
    }
    if (!Array.isArray(raw) || raw.length === 0) {
        return { ok: false, message: "Add at least one category.", key: Date.now() };
    }

    const seen = new Set<string>();
    const cats: Category[] = [];
    for (let i = 0; i < raw.length; i++) {
        const c = raw[i] as Partial<Category>;
        const label = String(c.label ?? "").trim();
        if (!label) return { ok: false, message: `Row ${i + 1}: a name is required.`, key: Date.now() };
        const slug = (c.slug && String(c.slug).trim()) || slugifyCategory(label);
        if (seen.has(slug)) return { ok: false, message: `Duplicate category "${slug}".`, key: Date.now() };
        seen.add(slug);
        cats.push({
            slug,
            label,
            ph: String(c.ph ?? "p1"),
            keywords: Array.isArray(c.keywords)
                ? c.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
                : [],
            showOnHome: !!c.showOnHome,
            showAsPill: !!c.showAsPill,
            dynamic: c.dynamic === "thirtyMin" ? "thirtyMin" : undefined,
            order: Number.isFinite(c.order) ? Number(c.order) : i,
        });
    }

    await saveCategories(cats);
    revalidatePath("/");
    revalidatePath("/recipes");
    return { ok: true, message: `Saved ${cats.length} categories.`, key: Date.now() };
}

// --- bulk categorize: preview (read-only) ---
export async function previewCategorize(): Promise<ScanResult & { ok: boolean; message?: string }> {
    await requireRole(["ADMIN"]);
    const cats = await getCategories();
    const rows = await prisma.recipe.findMany({
        select: { id: true, title: true, category: true, readyIn: true },
    });
    return { ...scanRecipes(rows, cats), ok: true };
}

// --- bulk categorize: apply (writes only recipes whose category is still "") ---
export async function applyCategorize(): Promise<{ ok: boolean; written: number; message: string }> {
    await requireRole(["ADMIN"]);
    const cats = await getCategories();
    const rows = await prisma.recipe.findMany({
        select: { id: true, title: true, category: true, readyIn: true },
    });
    const scan = scanRecipes(rows, cats);

    let written = 0;
    for (const bucket of scan.buckets) {
        if (!bucket.titles.length) continue;
        const res = await prisma.recipe.updateMany({
            where: { id: { in: bucket.titles.map((t) => t.id) }, category: "" },
            data: { category: bucket.slug },
        });
        written += res.count;
    }

    revalidatePath("/");
    revalidatePath("/recipes");
    return { ok: true, written, message: `Categorized ${written} recipes.` };
}
