// src/lib/kitchen.ts
import { prisma } from "@/lib/prisma";

/* Saved / bookmarked recipes (newest first) */
export async function savedRecipes(userId: string) {
    const rows = await prisma.bookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
            createdAt: true,
            recipe: {
                select: { id: true, slug: true, title: true, image: true, recipeType: true },
            },
        },
    });
    return rows.map((r) => ({ savedAt: r.createdAt, ...r.recipe }));
}

/* Which of these recipe ids has the user saved — for rendering card buttons */
export async function savedRecipeIds(userId: string, recipeIds: string[]) {
    if (recipeIds.length === 0) return new Set<string>();
    const rows = await prisma.bookmark.findMany({
        where: { userId, recipeId: { in: recipeIds } },
        select: { recipeId: true },
    });
    return new Set(rows.map((r) => r.recipeId));
}

/* The user's ratings + reviews (newest first) */
export async function myReviews(userId: string) {
    const rows = await prisma.comment.findMany({
        where: { userId, status: "APPROVED", rating: { not: null }, recipeId: { not: null } },
        orderBy: { createdAt: "desc" },
        select: {
            rating: true,
            body: true,
            createdAt: true,
            recipe: { select: { slug: true, title: true, image: true } },
        },
    });
    // Keep the {score, review, updatedAt, recipe} shape the activity page already reads.
    return rows
        .filter((r) => r.recipe)
        .map((r) => ({
            score: r.rating ?? 0,
            review: r.body,
            updatedAt: r.createdAt,
            recipe: r.recipe!,
        }));
}

/* Aggregate rating for a recipe — for the detail page */
export async function recipeRating(recipeId: string) {
    const agg = await prisma.rating.aggregate({
        where: { recipeId },
        _avg: { score: true },
        _count: { score: true },
    });
    return { average: agg._avg.score ?? 0, count: agg._count.score };
}

export async function myRatingFor(userId: string, recipeId: string) {
    return prisma.rating.findUnique({
        where: { userId_recipeId: { userId, recipeId } },
        select: { score: true, review: true },
    });
}

/* Shopping list grouped by source recipe */
export type ShoppingGroup = {
    recipeId: string | null;
    title: string;
    items: { id: string; text: string; checked: boolean }[];
};

export async function shoppingList(userId: string): Promise<ShoppingGroup[]> {
    const items = await prisma.shoppingItem.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, text: true, checked: true, recipeId: true, recipeTitle: true },
    });

    const groups = new Map<string, ShoppingGroup>();
    for (const it of items) {
        const key = it.recipeId ?? "__manual__";
        if (!groups.has(key)) {
            groups.set(key, {
                recipeId: it.recipeId,
                title: it.recipeId ? it.recipeTitle ?? "Recipe" : "Other items",
                items: [],
            });
        }
        groups.get(key)!.items.push({ id: it.id, text: it.text, checked: it.checked });
    }
    return Array.from(groups.values());
}

export async function shoppingCounts(userId: string) {
    const [total, checked] = await Promise.all([
        prisma.shoppingItem.count({ where: { userId } }),
        prisma.shoppingItem.count({ where: { userId, checked: true } }),
    ]);
    return { total, checked, remaining: total - checked };
}