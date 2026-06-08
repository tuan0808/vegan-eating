// src/lib/articles.ts
import { prisma } from "./prisma";
import type { Article } from "@/data/articles";

const arr = (s: string | null | undefined): string[] => {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toArticle = (a: any): Article => ({ id: a.id, slug: a.slug, title: a.title, sourceUrl: a.sourceUrl, date: a.date, image: a.image, body: arr(a.body) });

export async function listArticles(page = 1, perPage = 12): Promise<{ items: Article[]; total: number; page: number; perPage: number; totalPages: number }> {
    const [rows, total] = await Promise.all([
        prisma.article.findMany({ orderBy: { sort: "asc" }, skip: (page - 1) * perPage, take: perPage }),
        prisma.article.count(),
    ]);
    return { items: rows.map(toArticle), total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
    const a = await prisma.article.findUnique({ where: { slug } });
    return a ? toArticle(a) : null;
}

export async function articleCount(): Promise<number> {
    return prisma.article.count();
}