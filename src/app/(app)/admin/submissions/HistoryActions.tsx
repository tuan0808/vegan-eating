// src/app/(app)/admin/submissions/HistoryActions.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    pullBackSubmission,
    reopenSubmission,
    convertToRecipe,
} from "./actions";

export default function HistoryActions({
                                           id,
                                           status,
                                           threadHref,
                                           recipeSlug,
                                       }: {
    id: string;
    status: string;
    threadHref: string | null;
    recipeSlug: string | null;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function run(fn: (id: string) => Promise<{ ok: boolean; error?: string }>) {
        setError(null);
        startTransition(async () => {
            const res = await fn(id);
            if (!res.ok) {
                setError(res.error ?? "Something went wrong.");
                return;
            }
            router.refresh();
        });
    }

    return (
        <div className="hist-actions">
            {error && <span className="sub-actions-error">{error}</span>}

            {status === "APPROVED" && (
                <>
                    {threadHref && (
                        <Link href={threadHref} className="btn-ghost" target="_blank">
                            View thread
                        </Link>
                    )}

                    {recipeSlug ? (
                        <Link href={`/recipes/${recipeSlug}`} className="btn-ghost hist-incat" target="_blank">
                            In recipes ✓
                        </Link>
                    ) : (
                        <button
                            type="button"
                            className="btn-ghost"
                            disabled={pending}
                            onClick={() => run(convertToRecipe)}
                        >
                            {pending ? "Working…" : "Add to recipes"}
                        </button>
                    )}

                    <button
                        type="button"
                        className="btn-ghost hist-danger"
                        disabled={pending}
                        onClick={() => {
                            if (
                                confirm(
                                    "Pull this recipe back? The forum thread (and any replies) will be deleted and the recipe returns to Pending."
                                )
                            ) {
                                run(pullBackSubmission);
                            }
                        }}
                    >
                        Pull back
                    </button>
                </>
            )}

            {status === "REJECTED" && (
                <button
                    type="button"
                    className="btn-ghost"
                    disabled={pending}
                    onClick={() => run(reopenSubmission)}
                >
                    {pending ? "Working…" : "Re-open"}
                </button>
            )}
        </div>
    );
}