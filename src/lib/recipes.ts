// src/lib/recipes.ts
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import type { Recipe } from "@/data/recipes";

const arr = (s: string | null | undefined): string[] => {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};

// Cook-along photos: JSON array of { src, step } objects (step is a 0-based index or null).
const items = (s: string | null | undefined): { src: string; step: number | null }[] => {
    if (!s) return [];
    try {
        const v = JSON.parse(s);
        if (!Array.isArray(v)) return [];
        return v
            .filter((x) => x && typeof x.src === "string" && x.src.trim())
            .map((x) => ({ src: String(x.src), step: x.step == null ? null : Number(x.step) }));
    } catch { return []; }
};

// Normalize stored image paths the same way the Hero does: full URLs and
// root-absolute paths pass through; bare WP imports ("2025/01/x.jpg") get a
// leading slash so they resolve from the site root.
function normalizeImg(src: string | null | undefined): string | null {
    const s = (src ?? "").trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s) || s.startsWith("/")) return s;
    return "/" + s.replace(/^\.?\//, "");
}

// WordPress pages that were imported into the Recipe table but aren't recipes.
// Add any other stragglers you spot (about, contact, etc.) to this list.
const NON_RECIPE_SLUGS = [
    "terms-and-conditions",
    "privacy-policy",
    "cookie-policy",
    "disclaimer",
    "about",
    "about-us",
    "contact",
    "contact-us",
    "sample-page",
];

// Reusable Prisma filter that hides the non-recipe pages — and soft-hidden recipes — from every public list.
const recipeWhere = { slug: { notIn: NON_RECIPE_SLUGS }, hidden: false };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecipe(r: any): Recipe {
    return {
        id: r.id, slug: r.slug, title: r.title, sourceUrl: r.sourceUrl, date: r.date,
        description: r.description, recipeType: r.recipeType, author: r.author,
        courses: arr(r.courses), seasons: arr(r.seasons), allergens: arr(r.allergens), cuisines: arr(r.cuisines),
        prepTime: r.prepTime, cookTime: r.cookTime, readyIn: r.readyIn, servings: r.servings, calories: r.calories,
        ingredients: arr(r.ingredients), steps: arr(r.steps), image: r.image, ph: r.ph,
        gallery: arr(r.gallery),
        cookalong: items(r.cookalong),
        hidden: !!r.hidden,
        category: r.category ?? "",
        views: r.views ?? 0,
    };
}

export async function listRecipes(page = 1, perPage = 12, filter: Prisma.RecipeWhereInput = {}): Promise<{ items: Recipe[]; total: number; page: number; perPage: number; totalPages: number }> {
    const where: Prisma.RecipeWhereInput = { ...recipeWhere, ...filter };
    const [rows, total] = await Promise.all([
        prisma.recipe.findMany({ where, orderBy: { sort: "asc" }, skip: (page - 1) * perPage, take: perPage }),
        prisma.recipe.count({ where }),
    ]);
    return { items: rows.map(toRecipe), total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

// Admin listing — deliberately does NOT apply recipeWhere, so it includes
// soft-hidden recipes AND non-recipe junk (e.g. "terms-and-conditions") that
// editors need to see in order to manage or delete. Pass a composed `where`
// (search + pill filter) from the admin page.
export async function listRecipesAdmin(
    opts: { page?: number; perPage?: number; where?: Prisma.RecipeWhereInput; orderBy?: Prisma.RecipeOrderByWithRelationInput } = {},
): Promise<{ items: Recipe[]; total: number; page: number; perPage: number; totalPages: number }> {
    const page = opts.page ?? 1;
    const perPage = opts.perPage ?? 20;
    const where: Prisma.RecipeWhereInput = opts.where ?? {};
    const orderBy: Prisma.RecipeOrderByWithRelationInput = opts.orderBy ?? { sort: "asc" };
    const [rows, total] = await Promise.all([
        prisma.recipe.findMany({ where, orderBy, skip: (page - 1) * perPage, take: perPage }),
        prisma.recipe.count({ where }),
    ]);
    return { items: rows.map(toRecipe), total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function latestRecipes(n: number): Promise<Recipe[]> {
    const rows = await prisma.recipe.findMany({ where: recipeWhere, orderBy: { sort: "asc" }, take: n });
    return rows.map(toRecipe);
}

// Random selection (per request) — used for the rotating home sections.
export async function randomRecipes(n: number): Promise<Recipe[]> {
    const total = await prisma.recipe.count({ where: recipeWhere });
    if (total === 0) return [];
    // NON_RECIPE_SLUGS is a hardcoded constant (no user input), so inlining is safe.
    const notIn = NON_RECIPE_SLUGS.map((s) => `'${s}'`).join(", ");
    const picks = (await prisma.$queryRawUnsafe(
        `SELECT id FROM "Recipe" WHERE slug NOT IN (${notIn}) ORDER BY RANDOM() LIMIT ${Math.min(n, total)}`
    )) as { id: string }[];
    const rows = await prisma.recipe.findMany({ where: { id: { in: picks.map((p) => p.id) } } });
    return rows.map(toRecipe);
}

// A single random recipe image (per request) — used as a page backdrop
// (e.g. behind the login/register card). Prisma-native count + skip rather
// than raw SQL, so it stays Postgres-safe for the production migration, and
// selects only the image column — no full-table load. Restricted to recipes
// that actually have a non-empty image; returns a normalized, ready-to-use
// path (or null, in which case the caller should fall back to a solid colour).
export async function randomRecipeImage(): Promise<string | null> {
    const where: Prisma.RecipeWhereInput = {
        ...recipeWhere,
        AND: [{ image: { not: null } }, { image: { not: "" } }],
    };
    const total = await prisma.recipe.count({ where });
    if (total === 0) return null;
    const skip = Math.floor(Math.random() * total);
    const row = await prisma.recipe.findFirst({ where, skip, select: { image: true } });
    return normalizeImg(row?.image);
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
    if (NON_RECIPE_SLUGS.includes(slug)) return null; // /recipes/terms-and-conditions etc. now 404
    const r = await prisma.recipe.findUnique({ where: { slug } });
    return r ? toRecipe(r) : null;
}

export async function recipeCount(): Promise<number> {
    return prisma.recipe.count({ where: recipeWhere });
}

// Slugs (+ free-form date) of every public recipe, for the sitemap. Applies
// recipeWhere so the non-recipe junk slugs and soft-hidden recipes are excluded.
export async function allRecipeSlugs(): Promise<{ slug: string; date: string | null }[]> {
    return prisma.recipe.findMany({
        where: recipeWhere,
        select: { slug: true, date: true },
        orderBy: { sort: "asc" },
    });
}