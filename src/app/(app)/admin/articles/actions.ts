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
    data: { title: string; sourceUrl: string; date: string; image: string },
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
        },
    });
    revalidatePath("/admin/articles");
    revalidatePath(`/articles/${slug}`);
}