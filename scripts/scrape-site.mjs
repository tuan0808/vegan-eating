// scripts/scrape-site.mjs
/**
 * Crawl the live veganeating.com and rebuild local data from the source of truth.
 *  - Recipes  (/category/recipes/, paginated) -> src/data/recipes.json  (WITH images)
 *  - Articles (/category/health/,  paginated) -> src/data/articles.json
 *
 * Image URLs are rewritten:  .../wp-content/uploads/2025/01/x.jpeg -> /2025/01/x.jpeg
 *
 * Setup:   npm i -D cheerio
 * Usage:
 *   node scripts/scrape-site.mjs --limit 3     # quick test: scrape 3 recipes, print one
 *   node scripts/scrape-site.mjs               # full crawl (recipes + articles)
 *   node scripts/scrape-site.mjs --articles    # only articles
 *   node scripts/scrape-site.mjs --recipes-only
 *
 * Node 18+ (global fetch). Run locally where the site is reachable.
 */
import { readFileSync, writeFileSync } from "node:fs";
import * as cheerio from "cheerio";

const BASE = "https://veganeating.com";
const CONCURRENCY = 5;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const arg = (f) => process.argv.includes(f);
const limitIdx = process.argv.indexOf("--limit");
const LIMIT = limitIdx > -1 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;

const PH = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const EXCLUDE = new Set(["about-us","directory","search","community","sign-in","recipe-submission","privacy-policy","terms","contact","cart","checkout","my-account"]);

const toLocal = (url) => {
  if (!url) return null;
  const m = url.match(/\/uploads\/(\d{4}\/\d{2}\/[^?#"'\s]+\.(?:jpg|jpeg|png|webp|gif))/i);
  return m ? "/" + m[1] : null;
};
const slugOf = (url) => (url.match(/veganeating\.com\/([a-z0-9-]+)\/?$/i)?.[1] || "").toLowerCase();
const num = (v) => { const m = String(v || "").match(/\d+/); return m ? parseInt(m[0], 10) : null; };
const splist = (s) => String(s || "").split(/[,;]/).map((x) => x.trim()).filter(Boolean);
const cleanTitle = ($) => $('meta[property="og:title"]').attr("content") || $("title").text().replace(/\s*\|.*$/, "").trim();

async function getHtml(url) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (vegan-eating-importer)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function collectLinks(catPath) {
  const links = new Set();
  for (let page = 1; page <= 200; page++) {
    const url = page === 1 ? `${BASE}/${catPath}/` : `${BASE}/${catPath}/page/${page}/`;
    let html;
    try { html = await getHtml(url); } catch { break; }
    const $ = cheerio.load(html);
    let found = 0;
    $("a[href]").each((_, a) => {
      const m = ($(a).attr("href") || "").match(/^https?:\/\/veganeating\.com\/([a-z0-9-]+)\/?$/i);
      if (m && !EXCLUDE.has(m[1]) && !m[0].includes("/category/")) { if (!links.has(`${BASE}/${m[1]}/`)) found++; links.add(`${BASE}/${m[1]}/`); }
    });
    process.stdout.write(`  ${catPath} page ${page}: total ${links.size}\r`);
    if (found === 0) break;
    await sleep(120);
  }
  console.log("");
  return [...links];
}

export function parseRecipe(html, url, i = 0) {
  const $ = cheerio.load(html);

  let prep = null, cook = null, ready = null, cal = null, servings = "";
  $("ul.recipe-main-features > li").each((_, li) => {
    const label = $(li).find(".feature-names").text().trim().toLowerCase();
    const valText = $(li).find("span").first().text();
    if (label.includes("prep")) prep = num(valText);
    else if (label.includes("cook")) cook = num(valText);
    else if (label.includes("ready")) ready = num(valText);
    else if (label.includes("cal")) cal = num(valText);
    else if (label.includes("yield")) servings = (valText.match(/\d+/)?.[0]) || "";
  });

  let author = "", recipeType = "", allergens = [], seasons = [], cuisines = [], courses = [];
  $(".recipe-overview li").each((_, li) => {
    const label = $(li).find("span").first().text().toLowerCase();
    const val = $(li).find("strong").text().trim();
    if (label.includes("author")) author = val;
    else if (label.includes("type")) recipeType = val;
    else if (label.includes("allergen")) allergens = splist(val);
    else if (label.includes("season")) seasons = splist(val);
    else if (label.includes("cuisine")) cuisines = splist(val);
    else if (label.includes("course")) courses = splist(val);
  });

  const dd = $(".recipe-description").clone();
  dd.find("h2").remove();
  const description = dd.text().replace(/\s+/g, " ").trim();

  const ingredients = $(".recipe-ingredients li").map((_, li) => $(li).text().trim()).get().filter(Boolean);
  const steps = $(".recipe-steps li").map((_, li) => $(li).text().trim()).get().filter(Boolean);

  let src = $(".recipe-gallery img").first().attr("src");
  if (!src) $("img").each((_, el) => { const s = $(el).attr("src") || ""; if (!src && /\/wp-content\/uploads\//i.test(s) && !/logo/i.test(s)) src = s; });

  return {
    id: slugOf(url), slug: slugOf(url), title: cleanTitle($), sourceUrl: url, date: "",
    description, recipeType, author, courses, seasons, allergens, cuisines,
    prepTime: prep, cookTime: cook, readyIn: ready, servings, calories: cal,
    ingredients, steps, image: toLocal(src), ph: PH[i % PH.length],
  };
}

export function parseArticle(html, url) {
  const $ = cheerio.load(html);
  const title = cleanTitle($);
  const root = $(".single-health-content").first();
  const scope = root.length ? root : $("body");
  const body = scope.text().split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 1);
  let img = null;
  scope.find("img").each((_, el) => { const s = $(el).attr("src") || ""; if (!img && /\/wp-content\/uploads\//i.test(s) && !/logo/i.test(s)) img = toLocal(s); });
  return { slug: slugOf(url), title, sourceUrl: url, date: "", image: img, body };
}

async function pool(items, fn) {
  const q = [...items]; let done = 0; const total = items.length;
  const work = async () => { while (q.length) { await fn(q.shift()); if (++done % 10 === 0 || done === total) process.stdout.write(`  ${done}/${total}\r`); await sleep(80); } };
  await Promise.all(Array.from({ length: CONCURRENCY }, work));
  console.log("");
}

async function run() {
  if (!arg("--articles")) {
    console.log("Collecting recipe links …");
    const urls = (await collectLinks("category/recipes")).slice(0, LIMIT);
    console.log(`Scraping ${urls.length} recipes …`);
    const recipes = []; let i = 0;
    await pool(urls, async (u) => { try { recipes.push(parseRecipe(await getHtml(u), u, i++)); } catch (e) { console.warn("skip", u, e.message); } });
    writeFileSync("src/data/recipes.json", JSON.stringify(recipes, null, 0));
    console.log(`Wrote ${recipes.length} recipes (with images: ${recipes.filter((r) => r.image).length}, with steps: ${recipes.filter((r) => r.steps.length).length})`);
    if (recipes[0]) console.log("\nSAMPLE:\n", JSON.stringify(recipes[0], null, 2).slice(0, 1100));
  }
  if (!arg("--recipes-only")) {
    console.log("\nCollecting article links …");
    const urls = (await collectLinks("category/health")).slice(0, LIMIT);
    console.log(`Scraping ${urls.length} articles …`);
    const articles = [];
    await pool(urls, async (u) => { try { articles.push(parseArticle(await getHtml(u), u)); } catch (e) { console.warn("skip", u, e.message); } });
    writeFileSync("src/data/articles.json", JSON.stringify(articles, null, 0));
    console.log(`Wrote ${articles.length} articles (with body: ${articles.filter((a) => a.body.length).length})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run();
