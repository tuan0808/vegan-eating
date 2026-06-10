// src/app/(app)/admin/recipes/RecipeRow.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { quickUpdateRecipe } from "./actions";
import RecipeRowActions from "./RecipeRowActions";
import { RECIPE_CATEGORIES } from "@/lib/categories";

type QuickRecipe = {
    slug: string;
    title: string;
    recipeType: string | null;
    category: string | null;
    author: string | null;
    image: string | null;
    hidden: boolean;
    date: string | null;
    description: string | null;
    prepTime: number | null;
    cookTime: number | null;
    readyIn: number | null;
    servings: string | null;
    calories: number | null;
    courses: string[];
    cuisines: string[];
    allergens: string[];
    seasons: string[];
};

const initForm = (r: QuickRecipe) => ({
    title: r.title ?? "",
    recipeType: r.recipeType ?? "",
    category: r.category ?? "",
    author: r.author ?? "",
    date: r.date ?? "",
    servings: r.servings ?? "",
    image: r.image ?? "",
    prepTime: r.prepTime ?? "",
    cookTime: r.cookTime ?? "",
    readyIn: r.readyIn ?? "",
    calories: r.calories ?? "",
    description: r.description ?? "",
    courses: (r.courses ?? []).join(", "),
    cuisines: (r.cuisines ?? []).join(", "),
    allergens: (r.allergens ?? []).join(", "),
    seasons: (r.seasons ?? []).join(", "),
});

const numOrNull = (v: string | number): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
};

// "breakfast, brunch" -> ["breakfast", "brunch"]
const toList = (s: string): string[] => s.split(",").map((t) => t.trim()).filter(Boolean);

export default function RecipeRow({ recipe }: { recipe: QuickRecipe }) {
    const [expanded, setExpanded] = useState(false);
    const [f, setF] = useState(() => initForm(recipe));
    const [isPending, start] = useTransition();

    const editHref = `/admin/recipes/${recipe.slug}/edit`;
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setF((s) => ({ ...s, [k]: e.target.value }));

    const save = () =>
        start(async () => {
            await quickUpdateRecipe(recipe.slug, {
                title: f.title.trim(),
                recipeType: f.recipeType.trim(),
                category: f.category,
                author: f.author.trim(),
                date: f.date.trim(),
                servings: f.servings.trim(),
                image: f.image.trim(),
                prepTime: numOrNull(f.prepTime),
                cookTime: numOrNull(f.cookTime),
                readyIn: numOrNull(f.readyIn),
                calories: numOrNull(f.calories),
                description: f.description,
                courses: toList(f.courses),
                cuisines: toList(f.cuisines),
                allergens: toList(f.allergens),
                seasons: toList(f.seasons),
            });
            setExpanded(false);
        });

    const cancel = () => {
        setF(initForm(recipe));
        setExpanded(false);
    };

    return (
        <div className={`ar-item${recipe.hidden ? " is-hidden" : ""}${expanded ? " is-editing" : ""}`}>
            {/* Overlay click-to-edit is suppressed while quick-editing so the form is usable. */}
            {!expanded && <Link href={editHref} className="ar-rowlink" aria-label={`Edit ${recipe.title}`} />}

            <div className="ar-itemtop">
                <div className="ar-thumb">
                    {recipe.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={recipe.image} alt="" />
                    ) : (
                        <span className="ar-thumb-empty">🥕</span>
                    )}
                </div>

                <div className="ar-meta">
          <span className="ar-item-title">
            {recipe.title}
              {recipe.hidden && <span className="ar-badge">Hidden</span>}
          </span>
                    <span className="ar-item-sub">
            {recipe.recipeType || "—"}
                        {recipe.author ? ` · ${recipe.author}` : ""}
                        {recipe.date ? ` · ${recipe.date}` : ""}
          </span>
                </div>

                <div className="ar-item-actions">
                    <button type="button" className="ar-quick" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
                        {expanded ? "Close" : "Quick edit"}
                    </button>
                    <Link href={editHref} className="ar-edit">Edit</Link>
                    <Link href={`/recipes/${recipe.slug}`} target="_blank" className="ar-view">View ↗</Link>
                    <RecipeRowActions slug={recipe.slug} hidden={recipe.hidden} />
                </div>
            </div>

            {expanded && (
                <div className="ar-quickedit">
                    <div className="ar-qe-grid">
                        <label className="ar-qe-field ar-qe-wide"><span>Title</span>
                            <input value={f.title} onChange={set("title")} /></label>
                        <label className="ar-qe-field"><span>Recipe type</span>
                            <input value={f.recipeType} onChange={set("recipeType")} /></label>
                        <label className="ar-qe-field"><span>Category</span>
                            <select value={f.category} onChange={set("category")}>
                                <option value="">— None —</option>
                                {RECIPE_CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select></label>
                        <label className="ar-qe-field"><span>Author</span>
                            <input value={f.author} onChange={set("author")} /></label>
                        <label className="ar-qe-field"><span>Date</span>
                            <input value={f.date} onChange={set("date")} /></label>
                        <label className="ar-qe-field"><span>Servings</span>
                            <input value={f.servings} onChange={set("servings")} /></label>
                        <label className="ar-qe-field"><span>Prep (min)</span>
                            <input type="number" value={f.prepTime} onChange={set("prepTime")} /></label>
                        <label className="ar-qe-field"><span>Cook (min)</span>
                            <input type="number" value={f.cookTime} onChange={set("cookTime")} /></label>
                        <label className="ar-qe-field"><span>Ready (min)</span>
                            <input type="number" value={f.readyIn} onChange={set("readyIn")} /></label>
                        <label className="ar-qe-field"><span>Calories</span>
                            <input type="number" value={f.calories} onChange={set("calories")} /></label>
                        <label className="ar-qe-field ar-qe-wide"><span>Image path</span>
                            <input value={f.image} onChange={set("image")} placeholder="/uploads/…" /></label>
                        <label className="ar-qe-field ar-qe-wide"><span>Courses <em>(comma-separated)</em></span>
                            <input value={f.courses} onChange={set("courses")} placeholder="breakfast, brunch" /></label>
                        <label className="ar-qe-field ar-qe-wide"><span>Cuisines <em>(comma-separated)</em></span>
                            <input value={f.cuisines} onChange={set("cuisines")} placeholder="indian, thai" /></label>
                        <label className="ar-qe-field ar-qe-wide"><span>Allergens <em>(comma-separated)</em></span>
                            <input value={f.allergens} onChange={set("allergens")} placeholder="nuts, soy" /></label>
                        <label className="ar-qe-field ar-qe-wide"><span>Seasons <em>(comma-separated)</em></span>
                            <input value={f.seasons} onChange={set("seasons")} placeholder="autumn, winter" /></label>
                        <label className="ar-qe-field ar-qe-full"><span>Description</span>
                            <textarea rows={3} value={f.description} onChange={set("description")} /></label>
                    </div>
                    <div className="ar-qe-actions">
                        <button type="button" className="ar-qe-save" onClick={save} disabled={isPending}>
                            {isPending ? "Saving…" : "Save changes"}
                        </button>
                        <button type="button" className="ar-qe-cancel" onClick={cancel} disabled={isPending}>Cancel</button>
                        <Link href={editHref} className="ar-qe-full-edit">Full editor ↗</Link>
                    </div>
                </div>
            )}
        </div>
    );
}