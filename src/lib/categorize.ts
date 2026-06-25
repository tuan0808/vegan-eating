// src/lib/categorize.ts
//
// Pure category logic — NO prisma / next / "@/" imports, so it can be reused by
// both the admin server action AND the standalone CLI script (scripts/).

export type Category = {
    slug: string;        // e.g. "salads-bowls" — the ?cat= value and stored Recipe.category
    label: string;       // e.g. "Salads & bowls"
    ph: string;          // gradient class for the homepage card, e.g. "p6"
    keywords: string[];  // title keywords the bulk tool matches (singular base forms)
    showOnHome: boolean; // appears as a "Cook by collection" card
    showAsPill: boolean; // appears in the /recipes + admin filter pill row
    dynamic?: "thirtyMin"; // special collections assigned by a rule, not a stored field
    order: number;       // sort order for cards + pills
};

// Seed config — reproduces the previous hardcoded behaviour exactly. Used as the
// fallback whenever the admin hasn't saved a custom config yet.
export const DEFAULT_CATEGORIES: Category[] = [
    { slug: "30-minutes", label: "Weeknight in 30", ph: "p1", keywords: [], showOnHome: true, showAsPill: true, dynamic: "thirtyMin", order: 0 },
    { slug: "salads-bowls", label: "Salads & bowls", ph: "p6", keywords: ["salad", "bowl", "slaw"], showOnHome: true, showAsPill: true, order: 1 },
    { slug: "baking", label: "Plant-based baking", ph: "p3", keywords: ["bread", "loaf", "loaves", "muffin", "scone", "bun", "bagel", "focaccia", "cornbread", "flatbread", "pita", "naan", "roll", "biscuit", "cracker", "croissant", "brioche", "baguette", "ciabatta", "pretzel", "dough"], showOnHome: true, showAsPill: true, order: 2 },
    { slug: "desserts", label: "Desserts", ph: "p2", keywords: ["dessert", "cake", "cupcake", "cookie", "brownie", "pie", "tart", "pudding", "cheesecake", "mousse", "ice cream", "sorbet", "custard", "fudge", "cobbler", "crumble", "donut", "doughnut", "parfait", "gelato"], showOnHome: true, showAsPill: true, order: 3 },
    { slug: "breakfast", label: "Breakfast", ph: "p4", keywords: ["breakfast", "brunch"], showOnHome: false, showAsPill: true, order: 4 },
    { slug: "mains", label: "Mains", ph: "p5", keywords: ["main", "dinner", "entree"], showOnHome: false, showAsPill: true, order: 5 },
];

// "Salads & Bowls!" -> "salads-bowls"
export function slugifyCategory(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

export type Rule = { slug: string; re: RegExp };

// Keyword categories become title-matching rules, in `order`. Each keyword
// matches as a whole word with an optional trailing "s" (salad -> salad/salads).
export function rulesFromCategories(cats: Category[]): Rule[] {
    return cats
        .filter((c) => !c.dynamic && c.keywords.length > 0)
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((c) => ({
            slug: c.slug,
            re: new RegExp(`\\b(${c.keywords.map(escapeRe).join("|")})s?\\b`, "i"),
        }));
}

export function classify(title: string, rules: Rule[]): string | null {
    for (const r of rules) if (r.re.test(title)) return r.slug;
    return null;
}

export type ScanRow = { id: string; title: string; recipeType?: string | null; category: string | null; readyIn: number | null };
export type ScanResult = {
    total: number;
    alreadyCategorized: number;
    buckets: { slug: string; titles: { id: string; title: string }[] }[];
    naTitles: string[];
    naCount: number;
    naSub30: number;
};

// Pure scan: given all recipes + the category config, decide what the bulk pass
// WOULD assign. Only touches recipes whose category is still "".
export function scanRecipes(rows: ScanRow[], cats: Category[]): ScanResult {
    const rules = rulesFromCategories(cats);
    const uncategorized = rows.filter((r) => (r.category ?? "") === "");
    const bucketMap = new Map<string, { id: string; title: string }[]>();
    const na: ScanRow[] = [];

    for (const r of uncategorized) {
        // Match keywords against the recipe TYPE as well as the title — the type
        // field ("Main Course", "Dessert", "Salad"…) is the most reliable signal
        // and is why title-only matching left so many recipes uncategorized.
        const slug = classify(`${r.title} ${r.recipeType ?? ""}`, rules);
        if (slug) {
            if (!bucketMap.has(slug)) bucketMap.set(slug, []);
            bucketMap.get(slug)!.push({ id: r.id, title: r.title });
        } else {
            na.push(r);
        }
    }

    return {
        total: rows.length,
        alreadyCategorized: rows.length - uncategorized.length,
        buckets: rules.map((rule) => ({ slug: rule.slug, titles: bucketMap.get(rule.slug) ?? [] })),
        naTitles: na.slice(0, 12).map((r) => r.title),
        naCount: na.length,
        naSub30: na.filter((r) => r.readyIn != null && r.readyIn <= 30).length,
    };
}
