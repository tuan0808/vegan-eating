// src/app/(app)/admin/articles/[slug]/edit/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(v: FormDataEntryValue | null): string {
    return typeof v === "string" ? v.trim() : "";
}

// Body editor -> Tiptap JSON doc, stored verbatim. The editor submits a
// stringified ProseMirror doc; we only accept a valid { type: "doc" } object,
// otherwise we store an empty doc rather than corrupt the column.
function bodyDoc(v: FormDataEntryValue | null): string {
    const raw = typeof v === "string" ? v : "";
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.type === "doc") {
            return JSON.stringify(parsed);
        }
    } catch { /* malformed — fall through to empty doc */ }
    return JSON.stringify({ type: "doc", content: [] });
}

// Tags input -> JSON array (comma-separated).
function tagsJson(v: FormDataEntryValue | null): string {
    const text = typeof v === "string" ? v : "";
    return JSON.stringify(text.split(",").map((t) => t.trim()).filter(Boolean));
}

// Images hidden field (JSON array of paths) -> { hero, galleryJson }.
// The first image is the hero; everything after it is the article gallery.
function splitImages(v: FormDataEntryValue | null): { hero: string | null; galleryJson: string } {
    let all: string[] = [];
    if (typeof v === "string" && v.trim()) {
        try {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed)) all = parsed.map((s) => String(s).trim()).filter(Boolean);
        } catch { /* ignore malformed */ }
    }
    return { hero: all[0] ?? null, galleryJson: JSON.stringify(all.slice(1)) };
}

export async function updateArticle(formData: FormData): Promise<void> {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const slug = str(formData.get("slug"));
    if (!slug) return;

    const { hero, galleryJson } = splitImages(formData.get("images"));

    await prisma.article.update({
        where: { slug },
        data: {
            title: str(formData.get("title")),
            sourceUrl: str(formData.get("sourceUrl")),
            date: str(formData.get("date")),
            image: hero,
            gallery: galleryJson,
            category: str(formData.get("category")),
            tags: tagsJson(formData.get("tags")),
            body: bodyDoc(formData.get("body")),
            hidden: formData.get("hidden") === "on",
        },
    });

    revalidatePath(`/articles/${slug}`);
    revalidatePath("/admin/articles");
    redirect(`/admin/articles/${slug}/edit?saved=1`);
}