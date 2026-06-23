// src/app/sitemap.ts
//
// Dynamic sitemap: static marketing routes + every public article, recipe and
// news slug. Served at /sitemap.xml and referenced from robots.txt. With
// thousands of recipes this is the main lever for getting them all crawled.
import type { MetadataRoute } from "next";
import { SITE_URL, toISO } from "@/lib/seo";
import { allArticleSlugs } from "@/lib/articles";
import { allRecipeSlugs } from "@/lib/recipes";
import { allNewsSlugs } from "@/lib/news";

// Re-fetch at most hourly — matches the content routes' ISR window.
export const revalidate = 3600;

const url = (path: string) => `${SITE_URL}${path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const [articles, recipes, news] = await Promise.all([
        allArticleSlugs(),
        allRecipeSlugs(),
        allNewsSlugs(),
    ]);

    const staticRoutes: MetadataRoute.Sitemap = [
        { url: url("/"), changeFrequency: "daily", priority: 1 },
        { url: url("/recipes"), changeFrequency: "daily", priority: 0.9 },
        { url: url("/articles"), changeFrequency: "weekly", priority: 0.8 },
        { url: url("/news"), changeFrequency: "hourly", priority: 0.7 },
        { url: url("/forum"), changeFrequency: "daily", priority: 0.6 },
        { url: url("/about"), changeFrequency: "monthly", priority: 0.4 },
        { url: url("/submit"), changeFrequency: "monthly", priority: 0.3 },
    ];

    const recipeRoutes: MetadataRoute.Sitemap = recipes.map((r) => ({
        url: url(`/recipes/${r.slug}`),
        lastModified: toISO(r.date),
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
        url: url(`/articles/${a.slug}`),
        lastModified: toISO(a.date),
        changeFrequency: "monthly",
        priority: 0.6,
    }));

    const newsRoutes: MetadataRoute.Sitemap = news.map((n) => ({
        url: url(`/news/${n.slug}`),
        lastModified: n.pubDate,
        changeFrequency: "monthly",
        priority: 0.4,
    }));

    return [...staticRoutes, ...recipeRoutes, ...articleRoutes, ...newsRoutes];
}
