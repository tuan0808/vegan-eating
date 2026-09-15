// src/lib/categories.ts

export type CategoryOption = { value: string; label: string };

// Recipes: the assignable category list is admin-managed and lives in the
// Setting KV store, so it can't be a static const — see recipeCategoryOptions()
// in ./category-config.ts. (It used to be derived from the hardcoded `pills`
// array, which silently ignored every category added via /admin/categories.)

/** Guarantees a recipe's stored category survives a round trip through a <select>.
 *
 *  A category removed from /admin/categories is no longer among the options, and
 *  a select whose value matches no option renders the FIRST one — so opening the
 *  editor and saving would silently re-file the recipe under whatever happens to
 *  sort first. Pin the orphaned value as an explicit option instead, marked so
 *  it's obvious the category is gone. Only its slug survives (the label lived in
 *  the config that was deleted), so the slug is what we show.
 *
 *  Pure — no prisma import — so the client-side quick-edit row can use it too. */
export function withCurrentCategory(
    options: CategoryOption[],
    current: string | null | undefined,
): CategoryOption[] {
    const value = (current ?? "").trim();
    if (!value || options.some((o) => o.value === value)) return options;
    return [...options, { value, label: `${value} — removed` }];
}

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