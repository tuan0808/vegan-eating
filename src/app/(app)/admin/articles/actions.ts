// src/app/(app)/admin/articles/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new Error("Not authorised");
    return user;
}

/** Soft hide / unhide. Public lists drop hidden articles; the row stays, survives reseeds. */
export async function setArticleHidden(slug: string, hidden: boolean): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.article.update({ where: { slug }, data: { hidden } });
    revalidatePath("/admin/articles");
    revalidatePath("/articles");
    revalidatePath(`/articles/${slug}`);
}

/** Hard delete. A scraped article returns on the next reseed unless removed from src/data/articles.json. */
export async function deleteArticle(slug: string): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.article.delete({ where: { slug } });
    revalidatePath("/admin/articles");
    revalidatePath("/articles");
}

/** Inline quick-edit: metadata only. The body lives in the full editor. */
export async function quickUpdateArticle(
    slug: string,
    data: { title: string; sourceUrl: string; date: string; image: string; category: string; tags: string[] },
): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.article.update({
        where: { slug },
        data: {
            title: data.title,
            sourceUrl: data.sourceUrl,
            date: data.date,
            image: data.image || null,
            category: data.category,
            tags: JSON.stringify(data.tags),
        },
    });
    revalidatePath("/admin/articles");
    revalidatePath(`/articles/${slug}`);
}

// ---------------------------------------------------------------------------
// Bulk actions. All operate on an explicit list of slugs the client collected
// (per-row checkboxes or "select all matching"), so nothing is ever acted on
// implicitly by filter. Empty list = no-op. Each returns a count for feedback.
// ---------------------------------------------------------------------------

/** Hide or unhide many articles at once. */
export async function bulkSetArticlesHidden(slugs: string[], hidden: boolean): Promise<{ count: number }> {
    await requireAdmin();
    const list = Array.from(new Set((slugs ?? []).filter(Boolean)));
    if (list.length === 0) return { count: 0 };

    const res = await prisma.article.updateMany({
        where: { slug: { in: list } },
        data: { hidden },
    });

    revalidatePath("/admin/articles");
    revalidatePath("/articles");
    return { count: res.count };
}

/** Hard-delete many articles at once. Comments cascade via the schema relation. */
export async function bulkDeleteArticles(slugs: string[]): Promise<{ count: number }> {
    await requireAdmin();
    const list = Array.from(new Set((slugs ?? []).filter(Boolean)));
    if (list.length === 0) return { count: 0 };

    const res = await prisma.article.deleteMany({
        where: { slug: { in: list } },
    });

    revalidatePath("/admin/articles");
    revalidatePath("/articles");
    return { count: res.count };
}