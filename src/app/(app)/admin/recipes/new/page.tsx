// src/app/(app)/admin/recipes/new/page.tsx
//
// Step 1 of 2 for writing a recipe by hand. This screen asks only for the few
// columns the Recipe model can't invent (title drives the slug/URL, which is
// permanent once saved). Everything else — description, photos, ingredients,
// steps, cook-along, tags — is filled in on the full editor this redirects to.
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import { createRecipe } from "../actions";
import "../admin-recipes.css";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const today = new Date().toISOString().slice(0, 10);

    return (
        <div className="admin-recipes">
            <div className="ar-topline">
                <Link href="/admin/recipes" className="ar-back">← All recipes</Link>
            </div>

            <div className="ar-head">
                <span className="ar-kicker">New recipe</span>
                <h1 className="ar-title">Start a recipe</h1>
                <p className="ar-dek">
                    Just the basics here. Save and you land in the full editor for the
                    description, photos, ingredients and method.
                </p>
            </div>

            <form action={createRecipe} className="ar-form">
                <fieldset className="ar-card">
                    <legend>Basics</legend>

                    <label className="ar-field">
                        <span>Title</span>
                        <input name="title" required autoFocus placeholder="e.g. Smoky butter bean stew" />
                    </label>

                    <label className="ar-field">
                        <span>URL slug <em className="ar-optional">optional</em></span>
                        <input name="slug" placeholder="left blank, it's built from the title" />
                        <small className="ar-hint">
                            Becomes <code>/recipes/your-slug</code>. It&rsquo;s permanent once saved,
                            so a clashing slug gets a <code>-2</code> suffix rather than overwriting anything.
                        </small>
                    </label>

                    <label className="ar-field">
                        <span>Category</span>
                        <select name="category" defaultValue="">
                            <option value="">— None —</option>
                            {RECIPE_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </label>

                    <div className="ar-row">
                        <label className="ar-field">
                            <span>Recipe type</span>
                            <input name="recipeType" placeholder="e.g. Main Course" />
                        </label>
                        <label className="ar-field">
                            <span>Author</span>
                            <input name="author" defaultValue={user.name ?? ""} />
                        </label>
                    </div>

                    <label className="ar-field">
                        <span>Date</span>
                        <input name="date" defaultValue={today} />
                    </label>
                </fieldset>

                <p className="ar-hint">
                    New recipes are created <strong>hidden</strong>, so nothing half-written shows up
                    on the site. Tick <strong>Published</strong> in the editor when it&rsquo;s ready.
                </p>

                <div className="ar-actions">
                    <button type="submit" className="ar-save">Create &amp; open editor</button>
                    <Link href="/admin/recipes" className="ar-cancel">Cancel</Link>
                </div>
            </form>
        </div>
    );
}
