// src/lib/recipe-scale.ts
// Best-effort scaling + unit conversion for free-text ingredient lines
// (the WordPress import stores ingredients as plain strings).

const FRAC_CHARS = "½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";
const FRAC_VAL: Record<string, number> = {
    "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4,
    "⅕": 1 / 5, "⅖": 2 / 5, "⅗": 3 / 5, "⅘": 4 / 5,
    "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8,
};

export function parseServings(s?: string | null): number {
    if (!s) return 4;
    const m = String(s).match(/\d+/);
    return m ? Math.max(1, parseInt(m[0], 10)) : 4;
}

function tokenValue(tok: string): number | null {
    tok = tok.trim();
    if (tok in FRAC_VAL) return FRAC_VAL[tok];
    let m = tok.match(/^(\d+)\s+(\d+)\/(\d+)$/);            // "1 1/2"
    if (m) return +m[1] + +m[2] / +m[3];
    m = tok.match(new RegExp(`^(\\d+)\\s*([${FRAC_CHARS}])$`)); // "1 ½"
    if (m) return +m[1] + FRAC_VAL[m[2]];
    m = tok.match(/^(\d+)\/(\d+)$/);                         // "1/2"
    if (m) return +m[1] / +m[2];
    if (/^\d+(?:\.\d+)?$/.test(tok)) return parseFloat(tok); // "2" or "1.5"
    return null;
}

const AMOUNT_RE = new RegExp(
    `^(\\s*)` +
    `(\\d+\\s+\\d+\\/\\d+|\\d+\\s*[${FRAC_CHARS}]|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[${FRAC_CHARS}])` +
    `(?:\\s*[-\u2013]\\s*(\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[${FRAC_CHARS}]))?`
);

const UNIT_RE = /^\s*(kilograms?|kgs?|kg|grams?|g|millilitres?|milliliters?|mls?|ml|litres?|liters?|l|ounces?|oz|pounds?|lbs?|lb|fluid\s*ounces?|fl\s*oz|tablespoons?|tbsps?|tbsp|teaspoons?|tsps?|tsp|cups?|cup)\b/i;

function unitCanon(u: string): string | null {
    const x = u.toLowerCase().replace(/\s+/g, " ").trim();
    if (/^(kilograms?|kgs?|kg)$/.test(x)) return "kg";
    if (/^(grams?|g)$/.test(x)) return "g";
    if (/^(millilitres?|milliliters?|mls?|ml)$/.test(x)) return "ml";
    if (/^(litres?|liters?|l)$/.test(x)) return "l";
    if (/^(ounces?|oz)$/.test(x)) return "oz";
    if (/^(pounds?|lbs?|lb)$/.test(x)) return "lb";
    if (/^(fluid ounces?|fl oz)$/.test(x)) return "floz";
    if (/^(tablespoons?|tbsps?|tbsp)$/.test(x)) return "tbsp";
    if (/^(teaspoons?|tsps?|tsp)$/.test(x)) return "tsp";
    if (/^(cups?|cup)$/.test(x)) return "cup";
    return null;
}

function convert(value: number, canon: string, target: "metric" | "imperial"): { value: number; unit: string } {
    if (target === "imperial") {
        if (canon === "g") return { value: value / 28.3495, unit: "oz" };
        if (canon === "kg") return { value: value * 2.20462, unit: "lb" };
        if (canon === "ml") return { value: value / 29.5735, unit: "fl oz" };
        if (canon === "l") return { value: value * 4.22675, unit: "cups" };
    } else {
        if (canon === "oz") return { value: value * 28.3495, unit: "g" };
        if (canon === "lb") return { value: value * 0.453592, unit: "kg" };
        if (canon === "floz") return { value: value * 29.5735, unit: "ml" };
        if (canon === "cup") return { value: value * 236.588, unit: "ml" };
    }
    const display: Record<string, string> = { floz: "fl oz" };
    return { value, unit: display[canon] || canon }; // shared (tbsp/tsp) or already-native
}

function trimZeros(n: number): string {
    return n.toFixed(2).replace(/\.?0+$/, "");
}

function toFraction(v: number): string {
    if (!isFinite(v)) return "";
    const sign = v < 0 ? "-" : "";
    v = Math.abs(v);
    let whole = Math.floor(v);
    let eighth = Math.round((v - whole) * 8) / 8;
    if (eighth === 1) { whole += 1; eighth = 0; }
    if (eighth === 0) return sign + String(whole);
    const map: Record<string, string> = {
        "0.125": "⅛", "0.25": "¼", "0.375": "⅜", "0.5": "½", "0.625": "⅝", "0.75": "¾", "0.875": "⅞",
    };
    const f = map[String(eighth)];
    if (f) return sign + (whole > 0 ? whole + f : f);
    return sign + trimZeros(Math.round(v * 100) / 100);
}

function fmt(v: number, unit: string): string {
    const u = unit.toLowerCase();
    if (u === "g" || u === "ml") return String(Math.max(1, Math.round(v)));
    if (u === "kg" || u === "l") return trimZeros(Math.round(v * 100) / 100);
    return toFraction(v);
}

export function scaleLine(line: string, ratio: number, system: "metric" | "imperial"): string {
    const m = line.match(AMOUNT_RE);
    if (!m) return line; // no leading quantity → leave the line untouched
    const ws = m[1] || "";
    const aVal = tokenValue(m[2]);
    if (aVal == null) return line;
    const bVal = m[3] ? tokenValue(m[3]) : null;
    const afterAmount = line.slice(m[0].length);

    const um = afterAmount.match(UNIT_RE);
    const canon = um ? unitCanon(um[1]) : null;

    let aOut = aVal * ratio;
    let bOut = bVal != null ? bVal * ratio : null;

    if (um && canon) {
        const ca = convert(aOut, canon, system);
        aOut = ca.value;
        const unitOut = ca.unit;
        if (bOut != null) bOut = convert(bOut, canon, system).value;
        const remainder = afterAmount.slice(um[0].length);
        const amountStr = bOut != null ? `${fmt(aOut, unitOut)}\u2013${fmt(bOut, unitOut)}` : fmt(aOut, unitOut);
        return `${ws}${amountStr} ${unitOut}${remainder}`;
    }

    // no recognized unit → scale the number, keep everything after it verbatim
    const amountStr = bOut != null ? `${toFraction(aOut)}\u2013${toFraction(bOut)}` : toFraction(aOut);
    return `${ws}${amountStr}${afterAmount}`;
}

export function scaleAll(ingredients: string[], ratio: number, system: "metric" | "imperial"): string[] {
    return ingredients.map((l) => scaleLine(l, ratio, system));
}

// Pull the first time duration out of a step ("simmer for 20 minutes" -> 1200s).
export function extractTimer(text: string): number | null {
    const m = text.match(/(\d+)\s*(?:to|[-\u2013])?\s*(\d+)?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/i);
    if (!m) return null;
    const upper = m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10);
    const unit = m[3].toLowerCase();
    if (/^h/.test(unit)) return upper * 3600;
    if (/^m/.test(unit)) return upper * 60;
    return upper;
}

// ---- Per-step ingredient matching (used by Cook Mode) ----

const STOP = new Set([
    "and", "the", "with", "into", "of", "for", "to", "a", "an", "or", "plus", "more", "taste",
    "large", "small", "medium", "fresh", "ripe", "finely", "roughly", "thinly", "chopped",
    "diced", "sliced", "minced", "ground", "whole", "extra", "virgin", "good", "quality",
    "optional", "peeled", "grated", "crushed", "drained", "rinsed", "cooked", "raw", "about",
    "cup", "cups", "tbsp", "tsp", "tablespoon", "tablespoons", "teaspoon", "teaspoons",
    "gram", "grams", "kilogram", "kilograms", "ounce", "ounces", "pound", "pounds",
    "pinch", "handful", "can", "cans", "tin", "tins", "clove", "cloves", "piece", "pieces",
]);

export function ingredientKeywords(line: string): string[] {
    let s = line.toLowerCase();
    s = s.replace(/\([^)]*\)/g, " ");                 // drop parentheticals
    s = s.split(",")[0];                              // drop prep clause after first comma
    s = s.replace(/[0-9¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/.\-\u2013]+/g, " "); // drop numbers/fractions
    return s.split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 3 && !STOP.has(w));
}

function wordIn(hay: string, w: string): boolean {
    const variants = [w, w + "s", w + "es"];
    if (w.endsWith("s")) variants.push(w.slice(0, -1));
    if (w.endsWith("es")) variants.push(w.slice(0, -2));
    if (w.endsWith("y")) variants.push(w.slice(0, -1) + "ies");
    return variants.some((v) => hay.includes(" " + v + " "));
}

// Indices of the ingredients mentioned in a given step's text.
export function stepIngredientIndices(stepText: string, ingredients: string[]): number[] {
    const hay = " " + stepText.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ") + " ";
    const out: number[] = [];
    ingredients.forEach((ing, i) => {
        if (ingredientKeywords(ing).some((k) => wordIn(hay, k))) out.push(i);
    });
    return out;
}