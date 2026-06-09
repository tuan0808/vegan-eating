// src/lib/recipes.ts
import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";
import type { Recipe } from "@/data/recipes";

const arr = (s: string | null | undefined): string[] => {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};

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

// Reusable Prisma filter that hides the non-recipe pages from every list.
const recipeWhere = { slug: { notIn: NON_RECIPE_SLUGS } };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRecipe(r: any): Recipe {
    return {
        id: r.id, slug: r.slug, title: r.title, sourceUrl: r.sourceUrl, date: r.date,
        description: r.description, recipeType: r.recipeType, author: r.author,
        courses: arr(r.courses), seasons: arr(r.seasons), allergens: arr(r.allergens), cuisines: arr(r.cuisines),
        prepTime: r.prepTime, cookTime: r.cookTime, readyIn: r.readyIn, servings: r.servings, calories: r.calories,
        ingredients: arr(r.ingredients), steps: arr(r.steps), image: r.image, ph: r.ph,
        gallery: arr(r.gallery),
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

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
    if (NON_RECIPE_SLUGS.includes(slug)) return null; // /recipes/terms-and-conditions etc. now 404
    const r = await prisma.recipe.findUnique({ where: { slug } });
    return r ? toRecipe(r) : null;
}

export async function recipeCount(): Promise<number> {
    return prisma.recipe.count({ where: recipeWhere });
}