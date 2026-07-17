// src/app/(app)/admin/news/NewsRowActions.tsx
"use client";

import { useState, useTransition } from "react";
import { setNewsHidden, setNewsPublished, deleteNews } from "./actions";

export default function NewsRowActions({
    slug,
    hidden,
    published,
    isDupe,
}: {
    slug: string;
    hidden: boolean;
    published: boolean;
    isDupe: boolean;
}) {
    const [isPending, start] = useTransition();
    const [confirming, setConfirming] = useState(false);

    const toggleHide = () => start(() => { setNewsHidden(slug, !hidden); });
    const togglePublish = () => start(() => { setNewsPublished(slug, !published); });
    const doDelete = () => start(() => { deleteNews(slug); });

    return (
        <span className="ar-rowtools">
            {/* Editorial gate. A pending (unpublished, non-duplicate) story gets a
                prominent Publish button; a live one can be pulled back to pending.
                Duplicates are hidden by dedup, so publishing them isn't offered. */}
            {!isDupe && (
                <button
                    type="button"
                    className={published ? "ar-hide" : "ar-publish"}
                    onClick={togglePublish}
                    disabled={isPending}
                    style={
                        published
                            ? undefined
                            : { background: "#2f9e63", color: "#fff", border: "none", borderRadius: 999, padding: "4px 12px", fontWeight: 600 }
                    }
                >
                    {published ? "Unpublish" : "Publish"}
                </button>
            )}
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
