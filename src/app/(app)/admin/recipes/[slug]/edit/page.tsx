// src/app/(app)/admin/recipes/[slug]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { updateRecipe } from "./actions";
import RecipeListField from "./RecipeListField";
import "../../admin-recipes.css";

export const dynamic = "force-dynamic";

/** JSON string column → newline-joined text for a textarea. */
function toLines(json: string | null | undefined): string {
    if (!json) return "";
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.join("\n") : "";
    } catch {
        return "";
    }
}

/** JSON string column → string[] for the list editor. */
function toArray(json: string | null | undefined): string[] {
    if (!json) return [];
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.map(String) : [];
    } catch {
        return [];
    }
}

export default async function EditRecipePage({
                                                 params,
                                                 searchParams,
                                             }: {
    params: { slug: string };
    searchParams: { saved?: string };
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const recipe = await prisma.recipe.findUnique({ where: { slug: params.slug } });
    if (!recipe) notFound();

    const saved = searchParams?.saved === "1";

    return (
        <div className="admin-recipes">
            <div className="ar-topline">
                <Link href="/admin/recipes" className="ar-back">← All recipes</Link>
                <Link href={`/recipes/${recipe.slug}`} className="ar-viewlink" target="_blank">
                    View on site ↗
                </Link>
            </div>

            <div className="ar-head">
                <span className="ar-kicker">Editing recipe</span>
                <h1 className="ar-title">{recipe.title}</h1>
                <code className="ar-slug">/{recipe.slug}</code>
            </div>

            {saved && (
                <div className="ar-banner" role="status">
                    Saved. Your changes are live on the recipe page.
                </div>
            )}

            <form action={updateRecipe} className="ar-form">
                <input type="hidden" name="slug" value={recipe.slug} />

                {/* Basics */}
                <fieldset className="ar-card">
                    <legend>Basics</legend>

                    <label className="ar-field">
                        <span>Title</span>
                        <input name="title" defaultValue={recipe.title} required />
                    </label>

                    <label className="ar-field">
                        <span>Description</span>
                        <textarea name="description" rows={3} defaultValue={recipe.description} />
                    </label>

                    <div className="ar-row">
                        <label className="ar-field">
                            <span>Recipe type</span>
                            <input name="recipeType" defaultValue={recipe.recipeType} />
                        </label>
                        <label className="ar-field">
                            <span>Author</span>
                            <input name="author" defaultValue={recipe.author} />
                        </label>
                    </div>

                    <div className="ar-row">
                        <label className="ar-field">
                            <span>Date</span>
                            <input name="date" defaultValue={recipe.date} />
                        </label>
                        <label className="ar-field">
                            <span>Servings / yield</span>
                            <input name="servings" defaultValue={recipe.servings} />
                        </label>
                    </div>

                    <label className="ar-field">
                        <span>Image path</span>
                        <input name="image" defaultValue={recipe.image ?? ""} placeholder="/2025/01/example.jpeg" />
                    </label>
                    {recipe.image && (
                        // Plain img is fine here — admin preview, and the optimizer is off in WSL anyway.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="ar-preview" src={recipe.image} alt="" />
                    )}
                </fieldset>

                {/* Gallery */}
                <fieldset className="ar-card">
                    <legend>Gallery</legend>
                    <p className="ar-hint">
                        Extra photos shown on the recipe page. One image path per row — the first row is the lead shot.
                    </p>
                    <RecipeListField
                        name="gallery"
                        label="Gallery images"
                        noun="image"
                        preview
                        uploadable
                        initial={toArray(recipe.gallery)}
                        placeholder="/2025/01/photo.jpg"
                    />
                </fieldset>

                {/* Times & nutrition */}
                <fieldset className="ar-card">
                    <legend>Times &amp; nutrition</legend>
                    <div className="ar-row ar-row-4">
                        <label className="ar-field">
                            <span>Prep (min)</span>
                            <input name="prepTime" type="number" min={0} defaultValue={recipe.prepTime ?? ""} />
                        </label>
                        <label className="ar-field">
                            <span>Cook (min)</span>
                            <input name="cookTime" type="number" min={0} defaultValue={recipe.cookTime ?? ""} />
                        </label>
                        <label className="ar-field">
                            <span>Ready in (min)</span>
                            <input name="readyIn" type="number" min={0} defaultValue={recipe.readyIn ?? ""} />
                        </label>
                        <label className="ar-field">
                            <span>Calories</span>
                            <input name="calories" type="number" min={0} defaultValue={recipe.calories ?? ""} />
                        </label>
                    </div>
                </fieldset>

                {/* Ingredients & steps */}
                <fieldset className="ar-card">
                    <legend>Ingredients &amp; method</legend>
                    <div className="ar-row">
                        <RecipeListField
                            name="ingredients"
                            label="Ingredients"
                            noun="ingredient"
                            initial={toArray(recipe.ingredients)}
                            placeholder="e.g. 2 cups plain flour"
                        />
                        <RecipeListField
                            name="steps"
                            label="Steps"
                            noun="step"
                            ordered
                            initial={toArray(recipe.steps)}
                            placeholder="Describe this step…"
                        />
                    </div>
                </fieldset>

                {/* Taxonomy */}
                <fieldset className="ar-card">
                    <legend>Tags</legend>
                    <p className="ar-hint">One value per line.</p>
                    <div className="ar-row ar-row-4">
                        <label className="ar-field">
                            <span>Courses</span>
                            <textarea name="courses" rows={4} defaultValue={toLines(recipe.courses)} />
                        </label>
                        <label className="ar-field">
                            <span>Seasons</span>
                            <textarea name="seasons" rows={4} defaultValue={toLines(recipe.seasons)} />
                        </label>
                        <label className="ar-field">
                            <span>Allergens</span>
                            <textarea name="allergens" rows={4} defaultValue={toLines(recipe.allergens)} />
                        </label>
                        <label className="ar-field">
                            <span>Cuisines</span>
                            <textarea name="cuisines" rows={4} defaultValue={toLines(recipe.cuisines)} />
                        </label>
                    </div>
                </fieldset>

                <div className="ar-actions">
                    <button type="submit" className="ar-save">Save changes</button>
                    <Link href="/admin/recipes" className="ar-cancel">Cancel</Link>
                </div>
            </form>
        </div>
    );
}