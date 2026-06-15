// src/lib/articles.ts
import { prisma } from "./prisma";
import type { Article } from "@/data/articles";
import type { Prisma } from "@prisma/client";
import { parseBody } from "./article-body";

const arr = (s: string | null | undefined): string[] => {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toArticle = (a: any): Article => ({
    id: a.id, slug: a.slug, title: a.title, sourceUrl: a.sourceUrl,
    date: a.date, image: a.image, body: parseBody(a.body, arr(a.gallery)), hidden: !!a.hidden, tags: arr(a.tags), category: a.category ?? "", gallery: arr(a.gallery),
    views: a.views ?? 0,
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

// Articles in the same category (the "Related" rails). Falls back to recent
// visible articles when the current article has no category set.
export async function listRelatedArticles(category: string, excludeSlug: string, limit = 4): Promise<Article[]> {
    const where: Prisma.ArticleWhereInput = category
        ? { hidden: false, category, slug: { not: excludeSlug } }
        : { hidden: false, slug: { not: excludeSlug } };
    const rows = await prisma.article.findMany({ where, orderBy: { sort: "asc" }, take: limit });
    return rows.map(toArticle);
}

// Most-popular rail — ordered by real view count (highest first), with `sort`
// as a stable tiebreaker so the ordering is deterministic while counts are
// still low / tied.
export async function listPopularArticles(excludeSlug: string, limit = 5): Promise<Article[]> {
    const rows = await prisma.article.findMany({
        where: { hidden: false, slug: { not: excludeSlug } },
        orderBy: [{ views: "desc" }, { sort: "asc" }],
        take: limit,
    });
    return rows.map(toArticle);
}

// Recent visible articles — used as a placeholder for the "More from Author"
// tab until articles carry a real author field.
export async function listRecentArticles(excludeSlug: string, limit = 6): Promise<Article[]> {
    const rows = await prisma.article.findMany({
        where: { hidden: false, slug: { not: excludeSlug } },
        orderBy: { date: "desc" },
        take: limit,
    });
    return rows.map(toArticle);
}