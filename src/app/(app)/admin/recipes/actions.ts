// src/app/(app)/admin/recipes/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

// Admin gate shared by every action in this file.
async function requireAdmin() {
    const user = await requireUser(); // throws/redirects if logged out
    if (user.role !== "ADMIN") throw new Error("Not authorised");
    return user;
}

/** Soft hide / unhide: flips the `hidden` flag. Public lists drop hidden recipes;
 *  the row stays in the DB, survives reseeds, and is fully reversible. */
export async function setRecipeHidden(slug: string, hidden: boolean): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.recipe.update({ where: { slug }, data: { hidden } });
    revalidatePath("/admin/recipes");
    revalidatePath("/recipes");
    revalidatePath(`/recipes/${slug}`);
}

/** Hard delete: removes the row entirely. Note: a scraped recipe will return on
 *  the next reseed unless it's also removed from src/data/recipes.json. */
export async function deleteRecipe(slug: string): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.recipe.delete({ where: { slug } });
    revalidatePath("/admin/recipes");
    revalidatePath("/recipes");
}

/** Inline quick-edit: updates the common metadata fields only. Ingredients,
 *  steps, gallery, cook-along, and tags stay with the full editor. */
export async function quickUpdateRecipe(
    slug: string,
    data: {
        title: string;
        recipeType: string;
        author: string;
        date: string;
        servings: string;
        image: string;
        prepTime: number | null;
        cookTime: number | null;
        readyIn: number | null;
        calories: number | null;
        description: string;
        courses: string[];
        cuisines: string[];
        allergens: string[];
        seasons: string[];
    },
): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.recipe.update({
        where: { slug },
        data: {
            title: data.title,
            recipeType: data.recipeType,
            author: data.author,
            date: data.date,
            servings: data.servings,
            image: data.image || null,
            prepTime: data.prepTime,
            cookTime: data.cookTime,
            readyIn: data.readyIn,
            calories: data.calories,
            description: data.description,
            courses: JSON.stringify(data.courses),
            cuisines: JSON.stringify(data.cuisines),
            allergens: JSON.stringify(data.allergens),
            seasons: JSON.stringify(data.seasons),
        },
    });
    revalidatePath("/admin/recipes");
    revalidatePath(`/recipes/${slug}`);
}