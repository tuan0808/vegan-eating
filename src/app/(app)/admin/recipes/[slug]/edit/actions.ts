// src/app/(app)/admin/recipes/[slug]/edit/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/** Split a textarea value into a clean string[] — one item per line, blanks dropped. */
function lines(value: FormDataEntryValue | null): string[] {
    if (typeof value !== "string") return [];
    return value
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
}

/** Parse an optional integer field; empty/non-numeric → null (matches the Int? columns). */
function intOrNull(value: FormDataEntryValue | null): number | null {
    if (typeof value !== "string" || value.trim() === "") return null;
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
}

/** Read a trimmed string field. */
function str(value: FormDataEntryValue | null): string {
    return typeof value === "string" ? value.trim() : "";
}

/** The description now arrives as a Tiptap JSON doc — store it verbatim, guard against junk. */
function bodyJson(value: FormDataEntryValue | null): string {
    const empty = JSON.stringify({ type: "doc", content: [] });
    if (typeof value !== "string" || !value.trim()) return empty;
    try {
        JSON.parse(value);
        return value;
    } catch {
        return empty;
    }
}

/** Clean the cook-along payload into an array of { src, step }. */
function cookalongClean(value: FormDataEntryValue | null): { src: string; step: number | null }[] {
    if (typeof value !== "string") return [];
    try {
        const v = JSON.parse(value);
        if (!Array.isArray(v)) return [];
        return v
            .filter((x) => x && typeof x.src === "string" && x.src.trim())
            .map((x) => ({
                src: String(x.src).trim(),
                step: x.step === null || x.step === undefined || x.step === "" ? null : Number(x.step),
            }));
    } catch {
        return [];
    }
}

export async function updateRecipe(formData: FormData) {
    // Admin-only write. requireUser() handles the logged-out case; we add the role gate.
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const slug = str(formData.get("slug"));
    if (!slug) throw new Error("Missing recipe slug.");

    // One uploader drives both: the FIRST image is the hero, the rest is the gallery collage.
    // (RecipeListField submits newline-joined values, so we read it through lines().)
    const imgs = lines(formData.get("gallery"));
    const cookalong = cookalongClean(formData.get("cookalong"));

    const data: Prisma.RecipeUpdateInput = {
        title: str(formData.get("title")),
        description: bodyJson(formData.get("description")), // Tiptap JSON doc
        recipeType: str(formData.get("recipeType")),
        category: str(formData.get("category")),
        author: str(formData.get("author")),
        date: str(formData.get("date")),
        servings: str(formData.get("servings")),
        prepTime: intOrNull(formData.get("prepTime")),
        cookTime: intOrNull(formData.get("cookTime")),
        readyIn: intOrNull(formData.get("readyIn")),
        calories: intOrNull(formData.get("calories")),
        // list fields are JSON strings — SQLite has no array type
        ingredients: JSON.stringify(lines(formData.get("ingredients"))),
        steps: JSON.stringify(lines(formData.get("steps"))),
        courses: JSON.stringify(lines(formData.get("courses"))),
        seasons: JSON.stringify(lines(formData.get("seasons"))),
        allergens: JSON.stringify(lines(formData.get("allergens"))),
        cuisines: JSON.stringify(lines(formData.get("cuisines"))),
        // intentionally NOT touched: slug/id (primary key + public URL), `ph`,
        // and the AI-image columns (image*/stepImages*) which the image panel owns.
    };

    // Hero + gallery: the AI image panel lives OUTSIDE this form and writes the
    // hero (recipe.image) directly. A form rendered BEFORE an AI hero was
    // approved carries an empty image list — and writing that would null the
    // freshly-approved hero. So the form's image list only wins when it actually
    // has entries; an empty list leaves the existing hero + gallery untouched.
    if (imgs.length > 0) {
        data.image = imgs[0] ?? null;            // first uploaded image
        data.gallery = JSON.stringify(imgs.slice(1)); // everything after the hero
    }

    // Same guard for cook-along: a stale/empty field shouldn't wipe the step
    // photos the AI panel pinned (those live in `cookalong`, recoverable from
    // `stepImages` via relinkStepImages, but better not to wipe them at all).
    // A non-empty field is authoritative and replaces what's stored.
    if (cookalong.length > 0) {
        data.cookalong = JSON.stringify(cookalong);
    }

    await prisma.recipe.update({ where: { slug }, data });

    // Make the change show up immediately on the live recipe page and the admin list.
    revalidatePath(`/recipes/${slug}`);
    revalidatePath("/admin/recipes");

    // Full-page redirect back to the editor — resets form state, shows the saved banner.
    redirect(`/admin/recipes/${slug}/edit?saved=1`);
}