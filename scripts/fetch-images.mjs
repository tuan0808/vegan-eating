// scripts/fetch-images.mjs
/**
 * Recover recipe featured images from the live WordPress site and write them
 * into src/data/recipes.json. The recipe rows in the CSV had no image, so we
 * pull each post's featured image via the WP REST API, matched by WordPress id.
 *
 * URL transform: .../wp-content/uploads/2024/11/3-5.jpg  ->  /2024/11/3-5.jpg
 * (matches your files in /public/2024/11/3-5.jpg)
 *
 * Usage:
 *   SITE=https://veganeating.com node scripts/fetch-images.mjs
 *
 * Needs Node 18+ (global fetch). Run it while the WP site is reachable.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SITE = (process.env.SITE || "https://veganeating.com").replace(/\/$/, "");

// turn a full WP uploads URL into a local /YYYY/MM/file path under /public
function toLocal(url) {
  if (!url) return null;
  const m = url.match(/\/uploads\/(\d{4}\/\d{2}\/[^?#]+)/i);
  return m ? "/" + m[1] : null;
}

async function buildFeaturedMap() {
  const map = new Map(); // wp post id -> local image path
  for (let page = 1; page <= 60; page++) {
    const res = await fetch(`${SITE}/wp-json/wp/v2/posts?per_page=100&page=${page}&_embed=wp:featuredmedia`);
    if (res.status === 400 || res.status === 404) break; // ran past the last page
    if (!res.ok) throw new Error(`WP API ${res.status} on page ${page}`);
    const posts = await res.json();
    if (!Array.isArray(posts) || posts.length === 0) break;
    for (const p of posts) {
      const src = p?._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
      const local = toLocal(src);
      if (local) map.set(String(p.id), local);
    }
    process.stdout.write(`  page ${page}: ${posts.length} posts (map size ${map.size})\r`);
    if (posts.length < 100) break;
  }
  console.log("");
  return map;
}

const recipes = JSON.parse(readFileSync("src/data/recipes.json", "utf8"));
console.log(`Fetching featured images from ${SITE} …`);
const map = await buildFeaturedMap();

let filled = 0, missing = 0;
for (const r of recipes) {
  const img = map.get(String(r.id));
  if (img) { r.image = img; filled++; }
  else missing++;
}

writeFileSync("src/data/recipes.json", JSON.stringify(recipes, null, 0));
console.log(`Done. Set image on ${filled} recipes, ${missing} still missing.`);
if (missing) console.log("Missing ones had no featured image on the site, or the WP id didn't match.");
