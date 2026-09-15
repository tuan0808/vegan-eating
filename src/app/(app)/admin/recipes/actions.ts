// src/app/(app)/admin/recipes/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
        category: string;
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
            category: data.category,
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

/* ---------------------------- create a new recipe ---------------------------- */

const PH = ["p1", "p2", "p3", "p4", "p5"];

/** Slug-safe title — same rules as slugify() in recipe-filters. */
function toSlug(s: string): string {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** First free slug of the form `base`, `base-2`, `base-3`… */
async function uniqueRecipeSlug(base: string): Promise<string> {
    const root = base || "recipe";
    let slug = root;
    let n = 2;
    while (await prisma.recipe.findUnique({ where: { slug } })) slug = `${root}-${n++}`;
    return slug;
}

/** Creates a bare recipe from the "New recipe" form and drops straight into the
 *  full editor, where ingredients, steps, photos and the description get filled in.
 *  It starts hidden so nothing half-written is ever public — untick "Published"
 *  in the editor (or Unhide in the list) when it's ready to go live. */
export async function createRecipe(formData: FormData): Promise<void> {
    await requireAdmin();

    const title = String(formData.get("title") ?? "").trim();
    if (!title) throw new Error("A title is required.");

    // An admin can hand-pick the URL; otherwise it comes off the title.
    const wanted = String(formData.get("slug") ?? "").trim();
    const slug = await uniqueRecipeSlug(toSlug(wanted || title));

    // Both the public list and the admin list order by `sort` ascending over an
    // imported 0…N range, so a new recipe takes the slot BEFORE the current
    // first one — otherwise it lands on the last page and is a nuisance to find.
    const minSort = await prisma.recipe.aggregate({ _min: { sort: true } });

    await prisma.recipe.create({
        data: {
            id: slug, // id === slug in this model
            slug,
            title,
            sourceUrl: "",
            date: String(formData.get("date") ?? "").trim(),
            description: "",  // filled in by the rich editor on the next screen
            recipeType: String(formData.get("recipeType") ?? "").trim(),
            category: String(formData.get("category") ?? "").trim(),
            author: String(formData.get("author") ?? "").trim(),
            ph: PH[title.length % PH.length], // gradient placeholder until a photo lands
            sort: (minSort._min.sort ?? 0) - 1,
            hidden: true, // drafts stay off the public site until published
        },
    });

    revalidatePath("/admin/recipes");
    revalidatePath("/recipes");
    redirect(`/admin/recipes/${slug}/edit?created=1`);
}
