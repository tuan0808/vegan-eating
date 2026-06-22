// src/app/(app)/admin/articles/_actions/article-images.ts
"use server";

// Generation runs through the streaming route. These are the small, fast actions.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAdmin() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") throw new Error("Not authorised");
}

type Result = { ok: boolean; message: string };

// Lock the generated (pending) hero in as the article's hero. The old hero is kept
// as the backup so you can swap back.
export async function setArticleHero(slug: string): Promise<Result> {
    await requireAdmin();
    if (!slug) return { ok: false, message: "Missing slug" };

    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return { ok: false, message: "Article not found" };
    if (!article.imagePending) return { ok: false, message: "No generated hero to set" };

    await prisma.article.update({
        where: { slug },
        data: {
            imageBackup: article.image ?? null,
            image: article.imagePending,
            imagePending: null,
        },
    });

    revalidatePath(`/admin/articles/${slug}/edit`);
    revalidatePath(`/articles/${slug}`);
    return { ok: true, message: "Hero set. Previous hero saved as backup." };
}

export async function discardPendingHero(slug: string): Promise<Result> {
    await requireAdmin();
    if (!slug) return { ok: false, message: "Missing slug" };
    await prisma.article.update({ where: { slug }, data: { imagePending: null } });
    revalidatePath(`/admin/articles/${slug}/edit`);
    return { ok: true, message: "Discarded the generated hero." };
}

export async function swapArticleHero(slug: string): Promise<Result> {
    await requireAdmin();
    if (!slug) return { ok: false, message: "Missing slug" };

    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return { ok: false, message: "Article not found" };
    if (!article.imageBackup) return { ok: false, message: "No backup hero to swap to" };

    await prisma.article.update({
        where: { slug },
        data: { image: article.imageBackup, imageBackup: article.image ?? null },
    });

    revalidatePath(`/admin/articles/${slug}/edit`);
    revalidatePath(`/articles/${slug}`);
    return { ok: true, message: "Swapped hero ↔ backup." };
}

// Clear the generated gallery (does not delete the files from storage).
export async function clearArticleSectionImages(slug: string): Promise<Result> {
    await requireAdmin();
    if (!slug) return { ok: false, message: "Missing slug" };
    await prisma.article.update({ where: { slug }, data: { sectionImages: "[]" } });
    revalidatePath(`/admin/articles/${slug}/edit`);
    return { ok: true, message: "Cleared the generated images." };
}