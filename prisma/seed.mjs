// prisma/seed.mjs
// Load scraped JSON into the database. Run after scraping: npm run db:seed
import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";

const prisma = new PrismaClient();
const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : []);

const recipes = read("src/data/recipes.json");
const articles = read("src/data/articles.json");

for (let i = 0; i < recipes.length; i++) {
  const r = recipes[i];
  const data = {
    id: r.id || r.slug, slug: r.slug, title: r.title || "", sourceUrl: r.sourceUrl || "", date: r.date || "",
    description: r.description || "", recipeType: r.recipeType || "", author: r.author || "",
    courses: JSON.stringify(r.courses || []), seasons: JSON.stringify(r.seasons || []),
    allergens: JSON.stringify(r.allergens || []), cuisines: JSON.stringify(r.cuisines || []),
    prepTime: r.prepTime ?? null, cookTime: r.cookTime ?? null, readyIn: r.readyIn ?? null,
    servings: r.servings || "", calories: r.calories ?? null,
    ingredients: JSON.stringify(r.ingredients || []), steps: JSON.stringify(r.steps || []),
    image: r.image ?? null, ph: r.ph || "p1", sort: i,
  };
  await prisma.recipe.upsert({ where: { slug: r.slug }, create: data, update: data });
}

for (let i = 0; i < articles.length; i++) {
  const a = articles[i];
  const data = { slug: a.slug, title: a.title || "", sourceUrl: a.sourceUrl || "", date: a.date || "", image: a.image ?? null, body: JSON.stringify(a.body || []), sort: i };
  await prisma.article.upsert({ where: { slug: a.slug }, create: data, update: data });
}

console.log(`Seeded ${recipes.length} recipes and ${articles.length} articles.`);
await prisma.$disconnect();
