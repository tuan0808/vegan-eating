// scripts/import-recipes.mjs
/**
 * Import WordPress recipe export (CSV) -> src/data/recipes.json
 *
 * Usage:
 *   npm i -D csv-parse        # one-time
 *   node scripts/import-recipes.mjs ./path/to/articles_clean.csv
 *
 * Re-run this whenever you re-export from WordPress.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

const file = process.argv[2] || "./articles_clean.csv";
const rows = parse(readFileSync(file, "utf8"), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
});

const num = (v) => {
  const m = String(v || "").match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};
const splist = (v) => String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
const lines = (v) => String(v || "").replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
const cleanStep = (s) => s.replace(/^\s*\d+[.)]\s*/, "").trim();

const PH = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const seen = new Set();

const out = rows
  .filter((r) => r.is_recipe === "True")
  .map((r, i) => {
    let slug = (r.slug || r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    if (seen.has(slug)) slug = `${slug}-${r.id}`;
    seen.add(slug);
    return {
      id: r.id,
      slug,
      title: (r.title || "").trim(),
      sourceUrl: (r.url || "").trim(),
      date: (r.date || "").slice(0, 10),
      description: (r.recipe_description || "").trim(),
      recipeType: (r.recipe_type || "").trim(),
      courses: splist(r.courses),
      seasons: splist(r.seasons),
      allergens: splist(r.allergens),
      prepTime: num(r.prep_time),
      cookTime: num(r.cook_time),
      readyIn: num(r.ready_in),
      servings: (r.yield || "").trim(),
      calories: num(r.calories),
      ingredients: lines(r.ingredients),
      steps: lines(r.steps).map(cleanStep),
      image: null,
      ph: PH[i % PH.length],
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1));

writeFileSync("src/data/recipes.json", JSON.stringify(out, null, 0));
console.log(`Imported ${out.length} recipes -> src/data/recipes.json`);
