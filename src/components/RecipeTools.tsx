// src/components/RecipeTools.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import CookMode from "./CookMode";
import { scaleAll } from "@/lib/recipe-scale";
import { addRecipeToShoppingList } from "@/lib/actions/kitchen";

export default function RecipeTools({
                                        ingredients, baseServings, steps, title, timing, recipeId,
                                    }: {
    ingredients: string[];
    baseServings: number;
    steps: string[];
    title: string;
    timing?: string;
    recipeId: string;
}) {
    const [servings, setServings] = useState(baseServings);
    const [system, setSystem] = useState<"metric" | "imperial">("metric");
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [cook, setCook] = useState(false);
    const [added, setAdded] = useState(false);
    const [pending, start] = useTransition();

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
                    <button className={`rt-shop${added ? " ok" : ""}`} onClick={addToList} disabled={pending}>
                        {added ? "✓ Added to your shopping list" : "🛒 One-tap shopping list"}
                    </button>
                </div>
            </aside>

            <CookMode open={cook} onClose={() => setCook(false)} title={title} steps={steps} ingredients={scaled} timing={timing} />

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
                .rt-shop { margin-top: 10px; width: 100%; background: transparent; border: 1px solid var(--line, #e2e0d5);
                    border-radius: 12px; padding: 13px; font-weight: 600; font-size: 14.5px; cursor: pointer; color: var(--ink, #1b2a1d); }
                .rt-shop:hover { border-color: #5BB35F; }
                .rt-shop.ok { border-color: #5BB35F; color: #1f4a2f; background: rgba(91,179,95,.10); }
                .rt-shop:disabled { cursor: default; opacity: .8; }
            `}</style>
        </>
    );
}