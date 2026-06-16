// src/app/(app)/admin/news/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { syncNews } from "@/lib/news-sync";


async function requireAdmin() {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new Error("Not authorised");
    return user;
}

/**
 * Soft hide / unhide. This is the DURABLE curation tool: the sync's upsert never
 * touches `hidden`, so a hidden story stays hidden through every future sync.
 */
export async function setNewsHidden(slug: string, hidden: boolean): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.newsArticle.update({ where: { slug }, data: { hidden } });
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath(`/news/${slug}`);
}

/**
 * Hard delete. Note: if the story is still inside newsdata's ~48h window, the next
 * sync will re-create it (upsert keyed on externalId). To permanently keep something
 * off the public site, prefer Hide.
 */
export async function deleteNews(slug: string): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.newsArticle.delete({ where: { slug } });
    revalidatePath("/admin/news");
    revalidatePath("/news");
}

/**
 * Rename. Safe to edit: the sync only sets `title` on create, never on update,
 * so a rename persists across syncs.
 */
export async function renameNews(slug: string, title: string): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.newsArticle.update({
        where: { slug },
        data: { title: title.trim() || "Untitled" },
    });
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath(`/news/${slug}`);
}

export async function runNewsSyncNow(): Promise<{ fetched: number; saved: number }> {
    await requireAdmin();
    const result = await syncNews();
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath("/news/[slug]", "page");
    return result;
}