// src/components/SubstitutionsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { RecipeSub } from "@/lib/subs";

type Props = {
    open: boolean;
    loading: boolean;
    items: RecipeSub[];
    onClose: () => void;
};

export default function SubstitutionsPanel({ open, loading, items, onClose }: Props) {
    // Portal to <body>, so the fixed overlay is positioned against the viewport
    // and can't be offset by a transformed/relative ancestor on the recipe page.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    if (!open || !mounted) return null;

    const node = (
        <div className="sp" role="dialog" aria-modal="true" aria-label="Ingredient substitutions" onClick={onClose}>
            <div className="sp-card" onClick={(e) => e.stopPropagation()}>
                <div className="sp-head">
                    <div>
                        <span className="sp-kicker">Swaps</span>
                        <h3>Ingredient substitutions</h3>
                    </div>
                    <button className="sp-x" onClick={onClose} aria-label="Close">×</button>
                </div>

                {loading ? (
                    <p className="sp-msg">Finding swaps…</p>
                ) : items.length === 0 ? (
                    <p className="sp-msg">No substitutions on file for this recipe yet — we&rsquo;re still building the library.</p>
                ) : (
                    <ul className="sp-list">
                        {items.map((it) => (
                            <li key={it.key} className="sp-item">
                                <div className="sp-ing">
                                    {it.label}
                                    {!it.vegan ? <span className="sp-flag">make it vegan</span> : null}
                                </div>
                                <div className="sp-subs">
                                    {it.subs.map((s, n) => (
                                        <span key={n} className="sp-sub">
                                            {s.name}
                                            {s.note ? <em>{s.note}</em> : null}
                                        </span>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <style jsx>{`
                /* centered modal — desktop & laptop */
                .sp { position: fixed; inset: 0; z-index: 1100; background: rgba(15, 24, 17, 0.5);
                    display: flex; align-items: center; justify-content: center; padding: 24px; }
                .sp-card { position: relative; background: var(--card, #fffdf7); width: 100%; max-width: 620px;
                    border-radius: 20px; padding: 22px 24px 28px; max-height: 85vh; overflow: auto;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28); }
                .sp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
                .sp-kicker { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: var(--terra, #2f7d38); font-weight: 700; }
                .sp-head h3 { font-family: "Fraunces", Georgia, serif; font-size: 24px; margin: 4px 0 0; color: var(--ink, #20271c); }
                .sp-x { flex: 0 0 auto; width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--line, #e2e0d5);
                    background: #fff; font-size: 22px; line-height: 1; cursor: pointer; color: var(--ink, #20271c); }
                .sp-x:hover { border-color: #5bb35f; }
                .sp-msg { color: var(--muted, #6f7468); font-size: 15px; line-height: 1.6; margin: 8px 0 0; }
                .sp-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 18px; }
                .sp-item { border-top: 1px solid rgba(34, 95, 39, 0.12); padding-top: 16px; }
                .sp-item:first-child { border-top: 0; padding-top: 0; }
                .sp-ing { font-family: "Fraunces", Georgia, serif; font-size: 18px; color: var(--olive, #225f27);
                    display: flex; align-items: center; gap: 10px; }
                .sp-flag { font-family: "Hanken Grotesk", sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .06em;
                    text-transform: uppercase; color: var(--carrot, #b8451c); background: rgba(225, 90, 34, 0.10);
                    border-radius: 999px; padding: 3px 9px; }
                .sp-subs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
                .sp-sub { display: inline-flex; align-items: baseline; gap: 6px; background: rgba(47, 125, 56, 0.08);
                    border: 1px solid rgba(47, 125, 56, 0.16); border-radius: 12px; padding: 7px 12px;
                    font-size: 14px; font-weight: 600; color: var(--olive, #225f27); }
                .sp-sub em { font-style: normal; font-weight: 400; font-size: 12.5px; color: var(--muted, #6f7468); }

                /* bottom sheet — phones */
                @media (max-width: 560px) {
                    .sp { align-items: flex-end; padding: 0; }
                    .sp-card { max-width: none; border-radius: 18px 18px 0 0; max-height: 88vh; padding-bottom: 32px; }
                }
            `}</style>
        </div>
    );

    return createPortal(node, document.body);
}