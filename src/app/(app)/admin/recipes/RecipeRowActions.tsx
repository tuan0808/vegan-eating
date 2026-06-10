// src/app/(app)/admin/recipes/RecipeRowActions.tsx
"use client";

import { useState, useTransition } from "react";
import { setRecipeHidden, deleteRecipe } from "./actions";

export default function RecipeRowActions({ slug, hidden }: { slug: string; hidden: boolean }) {
    const [isPending, start] = useTransition();
    const [confirming, setConfirming] = useState(false);

    const toggleHide = () => start(() => { setRecipeHidden(slug, !hidden); });
    const doDelete = () => start(() => { deleteRecipe(slug); });

    return (
        <span className="ar-rowtools">
      <button type="button" className="ar-hide" onClick={toggleHide} disabled={isPending}>
        {hidden ? "Unhide" : "Hide"}
      </button>
            {confirming ? (
                <span className="ar-confirm">
          <button type="button" className="ar-del-yes" onClick={doDelete} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete?"}
          </button>
          <button type="button" className="ar-del-no" onClick={() => setConfirming(false)} disabled={isPending}>
            Cancel
          </button>
        </span>
            ) : (
                <button type="button" className="ar-del" onClick={() => setConfirming(true)} disabled={isPending}>
                    Delete
                </button>
            )}
    </span>
    );
}