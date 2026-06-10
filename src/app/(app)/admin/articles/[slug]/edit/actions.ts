// src/app/(app)/admin/articles/[slug]/edit/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(v: FormDataEntryValue | null): string {
    return typeof v === "string" ? v.trim() : "";
}

// Body textarea -> JSON array of paragraphs (blank line separates paragraphs).
function bodyJson(v: FormDataEntryValue | null): string {
    const text = typeof v === "string" ? v : "";
    const paragraphs = text.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
    return JSON.stringify(paragraphs);
}

export async function updateArticle(formData: FormData): Promise<void> {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const slug = str(formData.get("slug"));
    if (!slug) return;

    await prisma.article.update({
        where: { slug },
        data: {
            title: str(formData.get("title")),
            sourceUrl: str(formData.get("sourceUrl")),
            date: str(formData.get("date")),
            image: str(formData.get("image")) || null,
            body: bodyJson(formData.get("body")),
            hidden: formData.get("hidden") === "on",
        },
    });

    revalidatePath(`/articles/${slug}`);
    revalidatePath("/admin/articles");
    redirect(`/admin/articles/${slug}/edit?saved=1`);
}