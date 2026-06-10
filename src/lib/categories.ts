// src/lib/categories.ts
import { pills } from "@/data/site";
import { slugify } from "@/lib/recipe-filters";

export type CategoryOption = { value: string; label: string };

// Recipes: derived from the public pills so the picker can never drift from the
// filter bar. We drop "All" and the time-based "30 minutes" (that's a readyIn
// filter, not a stored category). Value is the SLUG — it matches both catFilter
// and the public pill links, e.g. "Salads & bowls" -> "salads-bowls".
export const RECIPE_CATEGORIES: CategoryOption[] = pills
    .filter((p) => slugify(p) !== "all" && slugify(p) !== "30-minutes")
    .map((p) => ({ value: slugify(p), label: p }));

// Articles: the editorial taxonomy used by the bulk categorizer. Value is the
// human-readable LABEL, because that's exactly the string written into each
// article's `category` column during the import.
export const ARTICLE_CATEGORIES: CategoryOption[] = [
    "Cooking Techniques",
    "Equipment & Appliances",
    "Ingredients",
    "Baking",
    "World Cuisines",
    "DIY & Fermenting",
    "Special Diets",
    "Health & Nutrition",
    "Budget & Sustainability",
    "Occasions & Lifestyle",
].map((c) => ({ value: c, label: c }));