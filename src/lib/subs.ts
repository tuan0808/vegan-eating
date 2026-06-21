// src/lib/subs.ts
// Shared logic for the ingredient-substitution feature. Used by both the
// build-subs script (to key the IngredientSub table) and the runtime action
// (to match a recipe's ingredient lines back to that table). Keeping the
// canonicalisation in one place is what makes the two sides line up.

import { ingredientKeywords } from "./recipe-scale";

export type Sub = { name: string; note?: string };
export type SubRow = { name: string; aliases: string[]; subs: Sub[]; vegan: boolean };
export type RecipeSub = { label: string; key: string; vegan: boolean; subs: Sub[] };

// Light plural -> singular fold so "eggs" and "egg", "split peas" and
// "split pea" collapse to the same key on both sides of the match.
function singular(w: string): string {
    if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
    if (w.length > 4 && w.endsWith("es") && !w.endsWith("ses")) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
    return w;
}

// The canonical key for a free-text ingredient line, e.g.
// "2 tbsp extra virgin olive oil" -> "olive oil"
// "1 cup split peas, rinsed"      -> "split pea"
export function canonicalName(line: string): string {
    return ingredientKeywords(line).map(singular).join(" ");
}

function keySet(s: string): Set<string> {
    return new Set(s.split(/\s+/).filter(Boolean));
}

function isSubset(a: Set<string>, b: Set<string>): boolean {
    if (a.size === 0) return false;
    for (const w of Array.from(a)) if (!b.has(w)) return false;
    return true;
}

// A human-friendly heading for a matched line:
// "1 cup split peas, rinsed" -> "Split peas"
export function displayLabel(line: string): string {
    let s = (line || "").toLowerCase();
    s = s.replace(/\([^)]*\)/g, " ");
    s = s.split(",")[0];
    s = s.replace(/^[\s\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.\-\u2013]+/, "");
    s = s.replace(
        /^\s*(kilograms?|kgs?|kg|grams?|g|millilitres?|milliliters?|mls?|ml|litres?|liters?|l|ounces?|oz|pounds?|lbs?|lb|fluid\s*ounces?|fl\s*oz|tablespoons?|tbsps?|tbsp|teaspoons?|tsps?|tsp|cups?|cup|cloves?|cans?|tins?|pinch(?:es)?|handfuls?|pieces?)\b\.?\s*/i,
        "",
    );
    s = s.trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : (line || "").trim();
}

// Given a recipe's raw ingredient lines and all known sub rows, return the
// substitutions that apply, in recipe order, de-duplicated by ingredient.
export function matchSubs(lines: string[], rows: SubRow[]): RecipeSub[] {
    // Pre-compute every matchable key set for each row (its name + aliases).
    const indexed = rows.map((row) => {
        const sets = [keySet(row.name)];
        for (const a of row.aliases) {
            const k = canonicalName(a);
            if (k) sets.push(keySet(k));
        }
        return { row, sets };
    });

    const out: RecipeSub[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
        const lineSet = keySet(canonicalName(line));
        if (lineSet.size === 0) continue;

        // Best match = the row whose key set is a subset of this line and is
        // the most specific (largest) such set.
        let best: { row: SubRow; size: number } | null = null;
        for (const { row, sets } of indexed) {
            for (const set of sets) {
                if (isSubset(set, lineSet) && (!best || set.size > best.size)) {
                    best = { row, size: set.size };
                }
            }
        }

        if (best && best.row.subs.length > 0 && !seen.has(best.row.name)) {
            seen.add(best.row.name);
            out.push({
                label: displayLabel(line),
                key: best.row.name,
                vegan: best.row.vegan,
                subs: best.row.subs,
            });
        }
    }

    return out;
}