// src/lib/recipe-xlsx.ts
//
// Single source of truth for the recipe spreadsheet schema. Export writes rows
// with recipeToRow(); import reads them with rowToData(). Keeping both here means
// the two halves of the round-trip can never drift apart.
import { slugify } from "@/lib/recipe-filters";

// Column order in the sheet. Each is also the DB field name (except none excluded
// here — id is intentionally omitted; slug is the key).
export const COLUMNS = [
    "slug", "sourceUrl", "title", "recipeType", "category", "author", "date", "description",
    "courses", "seasons", "allergens", "cuisines",
    "prepTime", "cookTime", "readyIn", "servings", "calories",
    "ingredients", "steps", "image", "gallery", "cookalong", "ph", "sort", "hidden",
] as const;
export type Col = (typeof COLUMNS)[number];

const PIPE = " | ";
const PIPE_SPLIT = /\s*\|\s*/;
const LINE_SPLIT = /\r?\n/;

// ---- low-level cell helpers -------------------------------------------------

function jsonArr(s: string | null | undefined): string[] {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}

// A worksheet cell value may be a string, number, boolean, null, or an object
// (rich text / formula / hyperlink). Normalise to a primitive.
export function cellValue(v: unknown): string | number | boolean | null {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (typeof o.text === "string") return o.text;
        if (o.result !== undefined) return o.result as string | number | boolean;
        if (Array.isArray(o.richText)) return (o.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
        return String(v);
    }
    return v as string | number | boolean;
}

const cellStr = (v: unknown): string => String(cellValue(v) ?? "").trim();
const cellInt = (v: unknown): number | null => {
    const s = cellStr(v);
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n) : null;
};
const cellBool = (v: unknown): boolean => {
    const raw = cellValue(v);
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "number") return raw !== 0;
    return /^(true|1|yes|y)$/i.test(String(raw).trim());
};

// ---- DB row -> spreadsheet row ---------------------------------------------

// `r` is a raw Prisma recipe (list fields are JSON strings).
export function recipeToRow(r: Record<string, unknown>): Record<Col, string | number | boolean | null> {
    return {
        slug: (r.slug as string) ?? "",
        sourceUrl: (r.sourceUrl as string) ?? "",
        title: (r.title as string) ?? "",
        recipeType: (r.recipeType as string) ?? "",
        category: (r.category as string) ?? "",
        author: (r.author as string) ?? "",
        date: (r.date as string) ?? "",
        description: (r.description as string) ?? "",
        courses: jsonArr(r.courses as string).join(PIPE),
        seasons: jsonArr(r.seasons as string).join(PIPE),
        allergens: jsonArr(r.allergens as string).join(PIPE),
        cuisines: jsonArr(r.cuisines as string).join(PIPE),
        prepTime: (r.prepTime as number) ?? null,
        cookTime: (r.cookTime as number) ?? null,
        readyIn: (r.readyIn as number) ?? null,
        servings: (r.servings as string) ?? "",
        calories: (r.calories as number) ?? null,
        ingredients: jsonArr(r.ingredients as string).join("\n"),
        steps: jsonArr(r.steps as string).join("\n"),
        image: (r.image as string) ?? "",
        gallery: jsonArr(r.gallery as string).join(PIPE),
        cookalong: (r.cookalong as string) ?? "[]", // raw structured JSON, round-trips exactly
        ph: (r.ph as string) ?? "",
        sort: (r.sort as number) ?? null,
        hidden: !!r.hidden,
    };
}

// ---- spreadsheet row -> DB write data --------------------------------------

const listToJson = (cell: unknown, split: RegExp): string => {
    const s = cellStr(cell);
    if (!s) return "[]";
    return JSON.stringify(s.split(split).map((t) => t.trim()).filter(Boolean));
};

const cookalongToJson = (cell: unknown): string => {
    const s = cellStr(cell);
    if (!s) return "[]";
    try {
        const v = JSON.parse(s);
        if (!Array.isArray(v)) return "[]";
        return JSON.stringify(
            v.filter((x) => x && typeof x.src === "string" && x.src.trim())
                .map((x) => ({ src: String(x.src).trim(), step: x.step == null ? null : Number(x.step) })),
        );
    } catch { return "[]"; }
};

// The fields written to the DB (list values as JSON strings, matching how rows
// are stored). `sort` is returned separately so callers can decide whether to
// touch ordering on update.
export type RecipeData = {
    slug: string;
    sourceUrl: string;
    title: string;
    recipeType: string;
    category: string;
    author: string;
    date: string;
    description: string;
    courses: string;
    seasons: string;
    allergens: string;
    cuisines: string;
    prepTime: number | null;
    cookTime: number | null;
    readyIn: number | null;
    servings: string;
    calories: number | null;
    ingredients: string;
    steps: string;
    image: string | null;
    gallery: string;
    cookalong: string;
    ph: string;
    hidden: boolean;
};

export function rowToData(row: Record<string, unknown>): { slug: string; title: string; sort: number | null; data: RecipeData } {
    const title = cellStr(row.title);
    let slug = cellStr(row.slug);
    if (!slug) slug = slugify(title);

    const data: RecipeData = {
        slug,
        sourceUrl: cellStr(row.sourceUrl),
        title,
        recipeType: cellStr(row.recipeType),
        category: cellStr(row.category),
        author: cellStr(row.author),
        date: cellStr(row.date),
        description: cellStr(row.description),
        courses: listToJson(row.courses, PIPE_SPLIT),
        seasons: listToJson(row.seasons, PIPE_SPLIT),
        allergens: listToJson(row.allergens, PIPE_SPLIT),
        cuisines: listToJson(row.cuisines, PIPE_SPLIT),
        prepTime: cellInt(row.prepTime),
        cookTime: cellInt(row.cookTime),
        readyIn: cellInt(row.readyIn),
        servings: cellStr(row.servings),
        calories: cellInt(row.calories),
        ingredients: listToJson(row.ingredients, LINE_SPLIT),
        steps: listToJson(row.steps, LINE_SPLIT),
        image: cellStr(row.image) || null,
        gallery: listToJson(row.gallery, PIPE_SPLIT),
        cookalong: cookalongToJson(row.cookalong),
        ph: cellStr(row.ph) || "p1",
        hidden: cellBool(row.hidden),
    };

    return { slug, title, sort: cellInt(row.sort), data };
}

// True if the import data differs from the existing DB record on any field.
export function isRecipeChanged(existing: Record<string, unknown>, data: RecipeData): boolean {
    const norm = (v: unknown) => (v === null || v === undefined ? "" : String(v));
    const keys = Object.keys(data).filter((k) => k !== "slug") as (keyof RecipeData)[];
    return keys.some((k) => norm(existing[k]) !== norm(data[k]));
}