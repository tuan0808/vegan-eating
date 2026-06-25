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
    // Admin-only "NA" pill: recipes with no explicit category assigned yet.
    if (slug === "na" || slug === "uncategorized") return { category: "" };
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

// ---------------------------------------------------------------------------
// Free-text search.
//
// The old version passed the WHOLE query into a single `contains`, so
// "spinach and onions" looked for that exact phrase and matched nothing.
// This splits the query into words, drops filler words, and requires EVERY
// remaining word to appear somewhere in the recipe — title, description,
// ingredients, method, type, cuisine, or course. Each word can live in any
// of those fields.
// ---------------------------------------------------------------------------

// Filler words people type that shouldn't narrow the search.
const STOP = new Set([
    "and", "or", "with", "the", "a", "an", "of", "in", "on",
    "for", "to", "some", "any", "my", "i", "have", "got", "plus", "&",
]);

// "Spinach & Onions!" -> ["spinach", "onion"]
function tokenize(q: string): string[] {
    return q
        .toLowerCase()
        .split(/[^a-z0-9]+/)                          // break on non letter/number
        .filter((w) => w.length >= 2 && !STOP.has(w)) // drop tiny words + filler
        .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)) // onions -> onion
        .filter((w, i, arr) => arr.indexOf(w) === i); // de-dupe
}

// One word, matched against every field we treat as searchable content.
function wordMatch(w: string): Prisma.RecipeWhereInput {
    return {
        OR: [
            { title: { contains: w } },
            { description: { contains: w } },
            { ingredients: { contains: w } },
            { steps: { contains: w } },     // the method / "content"
            { recipeType: { contains: w } },
            { cuisines: { contains: w } },
            { courses: { contains: w } },
        ],
    };
}

// Every meaningful word must appear (AND), but each word can be in any field
// (OR). "spinach onions" => recipes that mention BOTH, anywhere.
// NOTE: SQLite `contains` is case-sensitive in Prisma; becomes insensitive on Postgres.
export function searchFilter(q: string): Prisma.RecipeWhereInput {
    const words = tokenize(q);
    if (words.length === 0) return {};
    return { AND: words.map(wordMatch) };
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