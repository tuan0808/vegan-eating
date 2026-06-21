// src/components/RecipeTools.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import CookMode from "./CookMode";
import SubstitutionsPanel from "./SubstitutionsPanel";
import { scaleAll } from "@/lib/recipe-scale";
import { addRecipeToShoppingList } from "@/lib/actions/kitchen";
import { getSubstitutions } from "@/lib/actions/subs";
import type { RecipeSub } from "@/lib/subs";

export default function RecipeTools({
                                        ingredients, baseServings, steps, title, timing, recipeId, photos,
                                    }: {
    ingredients: string[];
    baseServings: number;
    steps: string[];
    title: string;
    timing?: string;
    recipeId: string;
    photos?: { src: string; step: number | null }[];
}) {
    const [servings, setServings] = useState(baseServings);
    const [system, setSystem] = useState<"metric" | "imperial">("metric");
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [cook, setCook] = useState(false);
    const [added, setAdded] = useState(false);
    const [pending, start] = useTransition();
    const [subsOpen, setSubsOpen] = useState(false);
    const [subs, setSubs] = useState<RecipeSub[] | null>(null);
    const [subsPending, startSubs] = useTransition();

    const ratio = servings / baseServings;
    const scaled = useMemo(() => scaleAll(ingredients, ratio, system), [ratio, system, ingredients]);

    const toggle = (set: Set<number>, i: number) => {
        const n = new Set(set); n.has(i) ? n.delete(i) : n.add(i); return n;
    };

    // Same one-tap behaviour as the cart in the hero: the server expands this
    // recipe's ingredients into the signed-in user's saved shopping list.
    const addToList = () =>
        start(async () => {
            const n = await addRecipeToShoppingList(recipeId);
            if (n > 0) { setAdded(true); setTimeout(() => setAdded(false), 1800); }
        });

    // Open the panel; fetch matches once (the action reads the DB, no OpenAI at runtime).
    // Matched on the original lines — scaling only changes quantities, not the ingredient.
    const openSubs = () => {
        setSubsOpen(true);
        if (subs === null) {
            startSubs(async () => {
                const res = await getSubstitutions(ingredients);
                setSubs(res);
            });
        }
    };

    return (
        <>
            <aside>
                <div className="ing-card">
                    <span className="kicker">Ingredients</span>

                    <div className="rt-servings">
                        <button onClick={() => setServings((s) => Math.max(1, s - 1))} aria-label="Fewer servings">−</button>
                        <div className="rt-serv-val"><b>{servings}</b><span>servings</span></div>
                        <button onClick={() => setServings((s) => s + 1)} aria-label="More servings">+</button>
                    </div>

                    <div className="rt-presets">
                        {[0.5, 1, 2, 3].map((m) => {
                            const target = Math.max(1, Math.round(baseServings * m));
                            return (
                                <button key={m} className={servings === target ? "on" : ""} onClick={() => setServings(target)}>
                                    {m === 0.5 ? "½×" : `${m}×`}
                                </button>
                            );
                        })}
                    </div>
                    {servings !== baseServings && (
                        <p className="rt-scaled-note">Scaled from the original {baseServings} servings.</p>
                    )}

                    <div className="rt-toggle">
                        <button className={system === "metric" ? "on" : ""} onClick={() => setSystem("metric")}>Metric</button>
                        <button className={system === "imperial" ? "on" : ""} onClick={() => setSystem("imperial")}>Imperial</button>
                    </div>

                    <ul className="ing-list">
                        {scaled.map((ing, i) => (
                            <li key={i} className={checked.has(i) ? "done" : ""}>
                                <input type="checkbox" checked={checked.has(i)} onChange={() => setChecked((c) => toggle(c, i))} aria-label={ing} />
                                <span>{ing}</span>
                            </li>
                        ))}
                    </ul>

                    <button className="btn-primary rt-cook" onClick={() => setCook(true)}>
                        Start Cook Mode
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 3l14 9-14 9V3z" /></svg>
                    </button>

                    <div className="rt-actions">
                        <button className={`rt-shop${added ? " ok" : ""}`} onClick={addToList} disabled={pending}>
                            {added ? (
                                <>✓ Added</>
                            ) : (
                                <>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M2 3h2l2.3 12a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.6L21 7H5.2" /></svg>
                                    Shopping list
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            className="rt-subs"
                            onClick={openSubs}
                            aria-label="Find ingredient substitutions"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h13l-3-3M20 17H7l3 3" /></svg>
                            Substitutions
                        </button>
                    </div>
                </div>
            </aside>

            <CookMode open={cook} onClose={() => setCook(false)} title={title} steps={steps} ingredients={scaled} timing={timing} photos={photos} />

            <SubstitutionsPanel open={subsOpen} loading={subsPending} items={subs ?? []} onClose={() => setSubsOpen(false)} />

            <style jsx>{`
                .rt-servings { display: flex; align-items: center; gap: 14px; margin-top: 14px; }
                .rt-servings button { width: 38px; height: 38px; border-radius: 10px; line-height: 1;
                    border: 1px solid var(--line, #e2e0d5); background: #fff; font-size: 20px; cursor: pointer; }
                .rt-servings button:hover { border-color: #5BB35F; }
                .rt-serv-val { display: flex; flex-direction: column; align-items: center; min-width: 84px; }
                .rt-serv-val b { font-family: "Fraunces", serif; font-size: 24px; }
                .rt-serv-val span { font-size: 12px; color: var(--muted, #6f7468); text-transform: uppercase; letter-spacing: .08em; }
                .rt-toggle { display: flex; background: var(--paper, #eceadf); border-radius: 10px; padding: 4px; margin: 16px 0 4px; gap: 4px; }
                .rt-toggle button { flex: 1; border: 0; background: transparent; padding: 9px; border-radius: 7px;
                    font-weight: 600; font-size: 13.5px; color: var(--muted, #6f7468); cursor: pointer; }
                .rt-toggle button.on { background: #fff; color: var(--ink, #1b2a1d); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
                .rt-presets { display: flex; gap: 8px; margin-top: 12px; }
                .rt-presets button { flex: 1; border: 1px solid var(--line, #e2e0d5); background: #fff; border-radius: 9px;
                    padding: 9px; font-weight: 600; font-size: 13.5px; cursor: pointer; color: var(--ink, #1b2a1d); }
                .rt-presets button:hover { border-color: #5BB35F; }
                .rt-presets button.on { background: #1f4a2f; color: #fff; border-color: #1f4a2f; }
                .rt-scaled-note { font-size: 12px; color: var(--muted, #6f7468); margin: 8px 0 0; }
                .ing-list li.done span { text-decoration: line-through; opacity: .45; }
                .rt-cook { margin-top: 20px; width: 100%; justify-content: center; }
                .rt-actions { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
                .rt-actions > button { flex: 1 1 130px; min-width: 0; display: inline-flex; align-items: center;
                    justify-content: center; gap: 7px; border-radius: 12px; padding: 13px 12px;
                    font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap; }
                .rt-shop { background: #1f4a2f; color: #fff; border: 1px solid #1f4a2f; }
                .rt-shop:hover { background: #225f27; border-color: #225f27; }
                .rt-shop.ok { background: rgba(91,179,95,.14); color: #1f4a2f; border-color: #5BB35F; }
                .rt-shop:disabled { cursor: default; opacity: .85; }
                .rt-subs { background: #fff; color: var(--ink, #1b2a1d); border: 1px solid var(--line, #e2e0d5); }
                .rt-subs:hover { border-color: #5BB35F; }
            `}</style>
        </>
    );
}