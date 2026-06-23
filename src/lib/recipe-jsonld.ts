// src/lib/recipe-jsonld.ts
//
// Builds schema.org/Recipe JSON-LD from a Recipe row.
// Pure functions, no Prisma import — pass the row in. Easy to unit test.
//
// List fields accept EITHER a JSON string ("[\"a\",\"b\"]") or an already
// parsed array, because your data layer (getRecipeBySlug) parses them before
// the page sees them.

type ListField = string | string[] | null | undefined;

type RecipeLike = {
    slug: string;
    title: string;
    description?: string | null; // pass CLEAN text, not Tiptap JSON
    author?: string | null;
    date?: string | null; // free-form string in the DB; parsed defensively below
    image?: string | null; // hero
    gallery?: ListField; // paths
    ingredients?: ListField;
    steps?: ListField;
    prepTime?: number | null; // minutes
    cookTime?: number | null; // minutes
    readyIn?: number | null; // minutes (→ totalTime)
    servings?: string | null;
    calories?: number | null;
    cuisines?: ListField;
    courses?: ListField;
};

type BuildOpts = {
    siteUrl: string; // "https://veganeating.com" (no trailing slash)
    mediaBaseUrl?: string; // CDN base for relative image paths; falls back to siteUrl
};

// ---- helpers ---------------------------------------------------------------

// ListField → string[]. Tolerates null, bad JSON, non-arrays, and arrays
// that already arrived parsed.
function toStringArray(raw: ListField): string[] {
    if (!raw) return [];
    let arr: unknown[] = [];
    if (Array.isArray(raw)) {
        arr = raw;
    } else {
        try {
            const v: unknown = JSON.parse(raw);
            arr = Array.isArray(v) ? v : [];
        } catch {
            arr = [];
        }
    }
    return arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

// Minutes → ISO-8601 duration. schema.org REQUIRES this format, not "30 min".
//   30 → "PT30M"   60 → "PT1H"   90 → "PT1H30M"
function minutesToISO(min?: number | null): string | undefined {
    if (!min || min <= 0) return undefined;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}`;
}

// Any URL inside JSON-LD must be absolute. Leaves http(s) URLs untouched.
function absoluteUrl(path: string, base: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// Free-form date string → ISO. Returns undefined if it won't parse, so we
// never emit a garbage datePublished. Confirm this works against your real
// `date` values — if they're already "YYYY-MM-DD" this is a no-op.
function toISODate(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// ---- builder ---------------------------------------------------------------

export function buildRecipeJsonLd(recipe: RecipeLike, opts: BuildOpts): Record<string, unknown> {
    const { siteUrl, mediaBaseUrl } = opts;
    const base = mediaBaseUrl ?? siteUrl;
    const url = `${siteUrl.replace(/\/$/, "")}/recipes/${recipe.slug}`;

    const images = [recipe.image, ...toStringArray(recipe.gallery)]
        .filter((p): p is string => Boolean(p))
        .map((p) => absoluteUrl(p, base));

    const ingredients = toStringArray(recipe.ingredients);
    const steps = toStringArray(recipe.steps);

    const json: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: recipe.title,
        url,
        mainEntityOfPage: url,
    };

    if (recipe.description) json.description = recipe.description;
    if (images.length) json.image = images;
    if (recipe.author) json.author = { "@type": "Person", name: recipe.author };

    const published = toISODate(recipe.date);
    if (published) json.datePublished = published;

    if (ingredients.length) json.recipeIngredient = ingredients;
    if (steps.length) {
        json.recipeInstructions = steps.map((text, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            text,
        }));
    }

    const prep = minutesToISO(recipe.prepTime);
    const cook = minutesToISO(recipe.cookTime);
    const total = minutesToISO(recipe.readyIn);
    if (prep) json.prepTime = prep;
    if (cook) json.cookTime = cook;
    if (total) json.totalTime = total;

    if (recipe.servings) json.recipeYield = recipe.servings;
    if (recipe.calories) {
        json.nutrition = {
            "@type": "NutritionInformation",
            calories: `${recipe.calories} calories`,
        };
    }

    const cuisines = toStringArray(recipe.cuisines);
    if (cuisines.length) json.recipeCuisine = cuisines;
    const courses = toStringArray(recipe.courses);
    if (courses.length) json.recipeCategory = courses;

    // Site-wide truth: every recipe here is plant-based. If you ever store a
    // vegan/vegetarian distinction, branch to ".../VegetarianDiet" per recipe.
    json.suitableForDiet = "https://schema.org/VeganDiet";

    // NOTE: intentionally NO aggregateRating. Emitting one with zero/fake
    // reviews is a structured-data violation and can get rich results
    // suppressed site-wide. Add it only once real ratings exist.

    return json;
}

// Returns the string to drop into a <script type="application/ld+json">.
// The `<` escape prevents a "</script>" inside any field from breaking out
// of the tag (the one real XSS vector with inline JSON-LD).
export function recipeJsonLdScript(recipe: RecipeLike, opts: BuildOpts): string {
    return JSON.stringify(buildRecipeJsonLd(recipe, opts)).replace(/</g, "\\u003c");
}