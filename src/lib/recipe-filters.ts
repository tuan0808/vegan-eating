// src/lib/recipe-filters.ts
//
// Shared filter logic for the public /recipes page AND the admin recipe list,
// so the two never drift. Edit CATEGORY_KEYWORDS here and both update.
import type { Prisma } from "@prisma/client";

// "Salads & bowls" -> "salads-bowls", "30 minutes" -> "30-minutes", "All" -> "all"
export function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Category pills match against each recipe's `courses` (and `recipeType`) text.
// These keywords are best-guesses for common WordPress taxonomies — adjust them
// to match whatever your imported courses/recipeType values actually say.
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
    breakfast: ["breakfast", "brunch"],
    mains: ["main", "dinner", "entree"],
    baking: ["bak", "bread", "loaf"],
    "salads-bowls": ["salad", "bowl"],
    desserts: ["dessert", "sweet", "pudding"],
};

export function catFilter(slug?: string): Prisma.RecipeWhereInput {
    if (!slug || slug === "all") return {};
    if (slug === "30-minutes") return { readyIn: { lte: 30 } }; // readyIn is minutes
    // Explicit category wins; keyword match on courses/recipeType is the legacy fallback.
    const OR: Prisma.RecipeWhereInput[] = [{ category: slug }];
    const kws = CATEGORY_KEYWORDS[slug];
    if (kws) {
        kws.forEach((k) => {
            OR.push({ courses: { contains: k } });
            OR.push({ recipeType: { contains: k } });
        });
    }
    return { OR };
}

// Free-text search across title / description / ingredients.
// NOTE: SQLite `contains` is case-sensitive in Prisma; becomes insensitive on Postgres.
export function searchFilter(q: string): Prisma.RecipeWhereInput {
    if (!q) return {};
    return {
        OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { ingredients: { contains: q } },
        ],
    };
}

export function buildWhere(cat?: string, q?: string): Prisma.RecipeWhereInput {
    const conditions: Prisma.RecipeWhereInput[] = [];
    const c = catFilter(cat);
    if (Object.keys(c).length) conditions.push(c);
    if (q) conditions.push(searchFilter(q));
    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { AND: conditions };
}