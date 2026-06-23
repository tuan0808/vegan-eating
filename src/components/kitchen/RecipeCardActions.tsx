// src/components/kitchen/RecipeCardActions.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { toggleBookmark, addRecipeToShoppingList } from "@/lib/actions/kitchen";

export default function RecipeCardActions({
                                              recipeId,
                                              initialSaved = false,
                                              fetchSaved = false,
                                              className = "",
                                          }: {
    recipeId: string;
    initialSaved?: boolean;
    // On statically-cached pages (e.g. the ISR recipe detail page) the server
    // can't know the viewer's saved state, so opt in to a client-side read.
    // Card grids that already pass initialSaved leave this off → no extra fetch.
    fetchSaved?: boolean;
    className?: string;
}) {
    const [saved, setSaved] = useState(initialSaved);
    const [added, setAdded] = useState(false);
    const [pending, start] = useTransition();

    // Read the real saved state once on mount when asked to.
    useEffect(() => {
        if (!fetchSaved) return;
        let alive = true;
        fetch(`/api/kitchen/saved?recipeId=${encodeURIComponent(recipeId)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (alive && d && typeof d.saved === "boolean") setSaved(d.saved);
            })
            .catch(() => {});
        return () => {
            alive = false;
        };
    }, [fetchSaved, recipeId]);

    // Cards are links — keep taps on these controls from navigating.
    const stop = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    function onSave(e: React.MouseEvent) {
        stop(e);
        setSaved((s) => !s); // optimistic
        start(async () => {
            const next = await toggleBookmark(recipeId);
            setSaved(next);
        });
    }

    function onAdd(e: React.MouseEvent) {
        stop(e);
        start(async () => {
            const n = await addRecipeToShoppingList(recipeId);
            if (n > 0) {
                setAdded(true);
                setTimeout(() => setAdded(false), 1800);
            }
        });
    }

    return (
        <div className={`rca ${className}`}>
            <button
                type="button"
                className={`rca-btn${saved ? " on" : ""}`}
                aria-pressed={saved}
                aria-label={saved ? "Remove from saved" : "Save recipe"}
                title={saved ? "Saved" : "Save recipe"}
                onClick={onSave}
                disabled={pending}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path
                        d="M12 21s-7.5-4.6-10-9.3C.6 8.4 2.3 5 5.6 5c2 0 3.3 1.1 4.4 2.6C11.1 6.1 12.4 5 14.4 5 17.7 5 19.4 8.4 22 11.7 19.5 16.4 12 21 12 21z"
                        fill={saved ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth="1.7"
                    />
                </svg>
            </button>

            <button
                type="button"
                className={`rca-btn${added ? " ok" : ""}`}
                aria-label="Add ingredients to shopping list"
                title="Add to shopping list"
                onClick={onAdd}
                disabled={pending}
            >
                {added ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                            d="M6 6h15l-1.5 9h-12L6 6zM6 6L5 3H2m4 16a1 1 0 100 2 1 1 0 000-2zm11 0a1 1 0 100 2 1 1 0 000-2z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </button>
        </div>
    );
}