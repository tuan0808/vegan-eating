// src/lib/articles.ts
import { prisma } from "./prisma";
import type { Article } from "@/data/articles";
import type { Prisma } from "@prisma/client";

const arr = (s: string | null | undefined): string[] => {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toArticle = (a: any): Article => ({
    id: a.id, slug: a.slug, title: a.title, sourceUrl: a.sourceUrl,
    date: a.date, image: a.image, body: arr(a.body), hidden: !!a.hidden, tags: arr(a.tags), category: a.category ?? "", gallery: arr(a.gallery),
});

// Public lists hide soft-hidden articles.
const articleWhere: Prisma.ArticleWhereInput = { hidden: false };

export async function listArticles(page = 1, perPage = 12, category?: string): Promise<{ items: Article[]; total: number; page: number; perPage: number; totalPages: number }> {
    const where: Prisma.ArticleWhereInput = { ...articleWhere, ...(category ? { category } : {}) };
    const [rows, total] = await Promise.all([
        prisma.article.findMany({ where, orderBy: { sort: "asc" }, skip: (page - 1) * perPage, take: perPage }),
        prisma.article.count({ where }),
    ]);
    return { items: rows.map(toArticle), total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

// Admin listing — includes hidden articles. Pass a composed `where` (search) and `orderBy`.
export async function listArticlesAdmin(
    opts: { page?: number; perPage?: number; where?: Prisma.ArticleWhereInput; orderBy?: Prisma.ArticleOrderByWithRelationInput } = {},
): Promise<{ items: Article[]; total: number; page: number; perPage: number; totalPages: number }> {
    const page = opts.page ?? 1;
    const perPage = opts.perPage ?? 20;
    const where: Prisma.ArticleWhereInput = opts.where ?? {};
    const orderBy: Prisma.ArticleOrderByWithRelationInput = opts.orderBy ?? { sort: "asc" };
    const [rows, total] = await Promise.all([
        prisma.article.findMany({ where, orderBy, skip: (page - 1) * perPage, take: perPage }),
        prisma.article.count({ where }),
    ]);
    return { items: rows.map(toArticle), total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
    const a = await prisma.article.findUnique({ where: { slug } });
    return a ? toArticle(a) : null;
}

export async function articleCount(): Promise<number> {
    return prisma.article.count({ where: articleWhere });
}