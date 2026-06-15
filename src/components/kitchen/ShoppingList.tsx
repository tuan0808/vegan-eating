// src/components/kitchen/ShoppingList.tsx
"use client";

import { useState, useTransition } from "react";
import type { ShoppingGroup } from "@/lib/kitchen";
import {
    toggleShoppingItem,
    removeShoppingGroup,
    addManualItem,
    clearCheckedItems,
    clearShoppingList,
} from "@/lib/actions/kitchen";

export default function ShoppingList({ groups }: { groups: ShoppingGroup[] }) {
    const [pending, start] = useTransition();
    const [text, setText] = useState("");

    const total = groups.reduce((n, g) => n + g.items.length, 0);

    function toggle(id: string, checked: boolean) {
        start(() => toggleShoppingItem(id, checked));
    }
    function add() {
        const t = text.trim();
        if (!t) return;
        setText("");
        start(() => addManualItem(t));
    }

    return (
        <div className="sl">
            {/* on-screen controls — hidden when printing */}
            <div className="sl-bar sl-noprint">
                <div className="sl-add">
                    <input
                        className="cm-input"
                        placeholder="Add an item…"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && add()}
                    />
                    <button type="button" className="cm-btn" onClick={add} disabled={pending}>
                        Add
                    </button>
                </div>
                <div className="sl-tools">
                    <button type="button" className="sl-link" onClick={() => window.print()}>
                        🖨 Print
                    </button>
                    <button
                        type="button"
                        className="sl-link"
                        onClick={() => start(() => clearCheckedItems())}
                        disabled={pending}
                    >
                        Clear ticked
                    </button>
                    <button
                        type="button"
                        className="sl-link danger"
                        onClick={() => {
                            if (confirm("Clear the whole list?")) start(() => clearShoppingList());
                        }}
                        disabled={pending}
                    >
                        Clear all
                    </button>
                </div>
            </div>

            {total === 0 ? (
                <div className="cm-empty">
                    Your list is empty. Tap the cart on any recipe to add its ingredients.
                </div>
            ) : (
                // .sl-print is the only region that prints
                <div className="sl-print">
                    <h2 className="sl-print-title">Shopping list</h2>
                    {groups.map((g) => (
                        <div key={g.recipeId ?? "manual"} className="sl-group">
                            <div className="sl-group-head">
                                <h3>{g.title}</h3>
                                <button
                                    type="button"
                                    className="sl-remove sl-noprint"
                                    onClick={() => start(() => removeShoppingGroup(g.recipeId))}
                                    disabled={pending}
                                    aria-label={`Remove ${g.title}`}
                                >
                                    ✕
                                </button>
                            </div>
                            <ul className="sl-items">
                                {g.items.map((it) => (
                                    <li key={it.id} className={it.checked ? "done" : ""}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={it.checked}
                                                onChange={(e) => toggle(it.id, e.target.checked)}
                                                className="sl-noprint"
                                            />
                                            <span className="sl-box" aria-hidden="true" />
                                            <span className="sl-text">{it.text}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}