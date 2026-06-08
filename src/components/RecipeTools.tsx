// src/components/RecipeTools.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CookMode from "./CookMode";
import { scaleAll } from "@/lib/recipe-scale";

export default function RecipeTools({
                                        ingredients, baseServings, steps, title, timing,
                                    }: {
    ingredients: string[];
    baseServings: number;
    steps: string[];
    title: string;
    timing?: string;
}) {
    const [servings, setServings] = useState(baseServings);
    const [system, setSystem] = useState<"metric" | "imperial">("metric");
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [cook, setCook] = useState(false);
    const [shop, setShop] = useState(false);
    const [shopSel, setShopSel] = useState<Set<number>>(() => new Set(ingredients.map((_, i) => i)));
    const [copied, setCopied] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const ratio = servings / baseServings;
    const scaled = useMemo(() => scaleAll(ingredients, ratio, system), [ratio, system, ingredients]);

    const toggle = (set: Set<number>, i: number) => {
        const n = new Set(set); n.has(i) ? n.delete(i) : n.add(i); return n;
    };

    const listText = scaled.filter((_, i) => shopSel.has(i)).map((s) => "• " + s.trim()).join("\n");
    const copyList = async () => {
        try { await navigator.clipboard.writeText(`${title} — shopping list\n\n${listText}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* noop */ }
    };
    const shareList = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { await (navigator as any).share?.({ title: `${title} — shopping list`, text: listText }); } catch { /* noop */ }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const canShare = mounted && typeof navigator !== "undefined" && !!(navigator as any).share;

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
                    <button className="rt-shop" onClick={() => setShop(true)}>🛒 One-tap shopping list</button>
                </div>
            </aside>

            <CookMode open={cook} onClose={() => setCook(false)} title={title} steps={steps} ingredients={scaled} timing={timing} />

            {shop && (
                <div className="rt-modal" onClick={() => setShop(false)}>
                    <div className="rt-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="rt-modal-head">
                            <h3>Shopping list</h3>
                            <button onClick={() => setShop(false)} aria-label="Close">✕</button>
                        </div>
                        <p className="rt-modal-sub">{servings} servings · {system}. Untick anything you already have.</p>
                        <ul className="rt-shop-list">
                            {scaled.map((ing, i) => (
                                <li key={i}>
                                    <input type="checkbox" checked={shopSel.has(i)} onChange={() => setShopSel((s) => toggle(s, i))} aria-label={ing} />
                                    <span className={shopSel.has(i) ? "" : "off"}>{ing}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="rt-modal-actions">
                            <button className="btn-primary" onClick={copyList}>{copied ? "Copied ✓" : "Copy list"}</button>
                            {canShare && <button onClick={shareList}>Share</button>}
                        </div>
                    </div>
                </div>
            )}

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
                .rt-modal { position: fixed; inset: 0; background: rgba(20,30,20,.45); display: flex;
                    align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
                .rt-modal-card { background: var(--card, #fffdf7); border-radius: 20px; padding: 26px;
                    width: 100%; max-width: 480px; max-height: 84vh; display: flex; flex-direction: column; }
                .rt-modal-head { display: flex; justify-content: space-between; align-items: center; }
                .rt-modal-head h3 { font-family: "Fraunces", serif; margin: 0; font-size: 22px; }
                .rt-modal-head button { background: transparent; border: 0; font-size: 20px; cursor: pointer; color: var(--muted, #6f7468); }
                .rt-modal-sub { font-size: 13px; color: var(--muted, #6f7468); margin: 6px 0 16px; text-transform: capitalize; }
                .rt-shop-list { list-style: none; padding: 0; margin: 0; overflow: auto; display: flex; flex-direction: column; gap: 11px; }
                .rt-shop-list li { display: flex; gap: 11px; align-items: flex-start; font-size: 15px; }
                .rt-shop-list .off { opacity: .4; text-decoration: line-through; }
                .rt-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
                .rt-modal-actions button { flex: 1; border-radius: 12px; padding: 13px; font-weight: 700; cursor: pointer; border: 0; }
                .rt-modal-actions button:not(.btn-primary) { background: var(--paper, #eceadf); color: var(--ink, #1b2a1d); }
            `}</style>
        </>
    );
}