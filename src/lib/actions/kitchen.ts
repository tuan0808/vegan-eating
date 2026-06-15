// src/lib/actions/kitchen.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";

/* Recipe.ingredients is a JSON string — usually string[], occasionally
   objects. Normalise to a clean list of lines. */
function parseIngredients(json: string | null | undefined): string[] {
    try {
        const v = JSON.parse(json || "[]");
        if (!Array.isArray(v)) return [];
        return v
            .map((x) =>
                typeof x === "string" ? x : (x?.text ?? x?.name ?? x?.item ?? ""),
            )
            .map((s) => String(s).trim())
            .filter(Boolean);
    } catch {
        return [];
    }
}

/* ---------------- Bookmarks ---------------- */
export async function toggleBookmark(recipeId: string): Promise<boolean> {
    const me = await requireUser();
    const existing = await prisma.bookmark.findUnique({
        where: { userId_recipeId: { userId: me.id, recipeId } },
        select: { id: true },
    });

    let saved: boolean;
    if (existing) {
        await prisma.bookmark.delete({ where: { id: existing.id } });
        saved = false;
    } else {
        await prisma.bookmark.create({ data: { userId: me.id, recipeId } });
        saved = true;
    }
    revalidatePath("/activity");
    return saved;
}

/* ---------------- Ratings / reviews ---------------- */
export async function saveRating(recipeId: string, score: number, review?: string) {
    const me = await requireUser();
    const clamped = Math.min(5, Math.max(1, Math.round(score)));
    const text = (review ?? "").trim().slice(0, 2000) || null;

    await prisma.rating.upsert({
        where: { userId_recipeId: { userId: me.id, recipeId } },
        create: { userId: me.id, recipeId, score: clamped, review: text },
        update: { score: clamped, review: text },
    });

    const r = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { slug: true },
    });
    if (r) revalidatePath(`/recipes/${r.slug}`);
    revalidatePath("/activity");
}

/* ---------------- Shopping list ---------------- */
// One tap on a card: fan the recipe's ingredients into list items.
// Idempotent — re-adding refreshes that recipe's lines rather than duplicating.
export async function addRecipeToShoppingList(recipeId: string): Promise<number> {
    const me = await requireUser();
    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { title: true, ingredients: true },
    });
    if (!recipe) return 0;

    const lines = parseIngredients(recipe.ingredients);
    if (lines.length === 0) return 0;

    await prisma.shoppingItem.deleteMany({ where: { userId: me.id, recipeId } });
    await prisma.shoppingItem.createMany({
        data: lines.map((text) => ({
            userId: me.id,
            recipeId,
            recipeTitle: recipe.title,
            text,
        })),
    });

    revalidatePath("/shopping-list");
    return lines.length;
}

export async function addManualItem(text: string) {
    const me = await requireUser();
    const clean = text.trim().slice(0, 200);
    if (!clean) return;
    await prisma.shoppingItem.create({ data: { userId: me.id, text: clean } });
    revalidatePath("/shopping-list");
}

export async function toggleShoppingItem(id: string, checked: boolean) {
    const me = await requireUser();
    await prisma.shoppingItem.updateMany({
        where: { id, userId: me.id },
        data: { checked },
    });
    revalidatePath("/shopping-list");
}

export async function removeShoppingGroup(recipeId: string | null) {
    const me = await requireUser();
    await prisma.shoppingItem.deleteMany({
        where: { userId: me.id, recipeId: recipeId ?? null },
    });
    revalidatePath("/shopping-list");
}

export async function clearCheckedItems() {
    const me = await requireUser();
    await prisma.shoppingItem.deleteMany({ where: { userId: me.id, checked: true } });
    revalidatePath("/shopping-list");
}

export async function clearShoppingList() {
    const me = await requireUser();
    await prisma.shoppingItem.deleteMany({ where: { userId: me.id } });
    revalidatePath("/shopping-list");
}