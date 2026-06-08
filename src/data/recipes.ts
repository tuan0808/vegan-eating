// src/data/recipes.ts
// Types + presentation helpers. Data now comes from the database (see src/lib/recipes.ts).

export type Recipe = {
  id: string;
  slug: string;
  title: string;
  sourceUrl: string;
  date: string;
  description: string;
  recipeType: string;
  author: string;
  courses: string[];
  seasons: string[];
  allergens: string[];
  cuisines: string[];
  prepTime: number | null;
  cookTime: number | null;
  readyIn: number | null;
  servings: string;
  calories: number | null;
  ingredients: string[];
  steps: string[];
  image: string | null;
  ph: string;
};

export function fmtTime(min: number | null): string {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

export function titleCase(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}