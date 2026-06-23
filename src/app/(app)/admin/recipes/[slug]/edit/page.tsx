// src/app/(app)/admin/recipes/[slug]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { updateRecipe } from "./actions";
import RecipeListField from "./RecipeListField";
import CookAlongField from "./CookAlongField";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import DescriptionEditor from "./DescriptionEditor";
import RecipeImagePanel from "../../_components/RecipeImagePanel";
import { parseBody } from "@/lib/article-body";
import "../../admin-recipes.css";
import "@/app/(app)/admin/articles/[slug]/edit/article-editor.css";

export const dynamic = "force-dynamic";

/** JSON string column -> [{ src, step }] for the cook-along editor. */
function toCookalong(json: string | null | undefined): { src: string; step: number | null }[] {
    if (!json) return [];
    try {
        const v = JSON.parse(json);
        if (!Array.isArray(v)) return [];
        return v
            .filter((x) => x && typeof x.src === "string")
            .map((x) => ({ src: String(x.src), step: x.step == null ? null : Number(x.step) }));
    } catch {
        return [];
    }
}

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
                                                 params: paramsP,
                                                 searchParams: searchParamsP,
                                             }: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ saved?: string }>;
}) {
    const params = await paramsP;
    const searchParams = await searchParamsP;
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const recipe = await prisma.recipe.findUnique({ where: { slug: params.slug } });
    if (!recipe) notFound();

    const saved = searchParams?.saved === "1";

    // Hero + gallery as one list — first image is the hero, the rest is the collage.
    const galleryList = [recipe.image, ...toArray(recipe.gallery)].filter((s): s is string => !!s && s.trim() !== "");

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
                        <span>Category</span>
                        <select name="category" defaultValue={recipe.category ?? ""}>
                            <option value="">— None —</option>
                            {RECIPE_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
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
                </fieldset>

                {/* Description (rich editor) */}
                <fieldset className="ar-card">
                    <legend>Description</legend>
                    <p className="ar-hint">The “About this recipe” intro. Use the toolbar or “/” for headings, lists, links, and images.</p>
                    <DescriptionEditor name="description" initial={parseBody(recipe.description)} />
                </fieldset>

                {/* Gallery (first image = hero) */}
                <fieldset className="ar-card">
                    <legend>Photos</legend>
                    <p className="ar-hint">
                        The <strong>first image is the hero</strong> (the big banner). The rest appear in the gallery below it. Drag order with ↑ ↓.
                    </p>
                    <RecipeListField
                        name="gallery"
                        label="Images"
                        noun="image"
                        preview
                        uploadable
                        initial={galleryList}
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

                {/* Cook-along */}
                <fieldset className="ar-card">
                    <legend>Cook-along</legend>
                    <p className="ar-hint">
                        Process photos that pin beside the method as readers scroll. Attach each one to the step it illustrates.
                    </p>
                    <CookAlongField name="cookalong" initial={toCookalong(recipe.cookalong)} steps={toArray(recipe.steps)} />
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

            {/* AI image generation — lives OUTSIDE the form above so its buttons
                never submit the recipe save form. Has its own server actions. */}
            <div style={{ marginTop: 24 }}>
                <RecipeImagePanel
                    slug={recipe.slug}
                    image={recipe.image}
                    imageBackup={recipe.imageBackup}
                    imagePending={recipe.imagePending}
                    stepImagesPending={toArray(recipe.stepImagesPending)}
                    stepCount={toArray(recipe.steps).length}
                    hasStepImages={toArray(recipe.stepImages).length > 0}
                />
            </div>
        </div>
    );
}