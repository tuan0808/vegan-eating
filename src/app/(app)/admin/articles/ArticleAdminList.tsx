// src/app/(app)/admin/articles/ArticleAdminList.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ArticleRow from "./ArticleRow";
import { bulkSetArticlesHidden, bulkDeleteArticles } from "./actions";

type QuickArticle = {
    slug: string;
    title: string;
    sourceUrl: string | null;
    date: string | null;
    image: string | null;
    hidden: boolean;
    category: string | null;
    tags: string[];
};

export default function ArticleAdminList({
                                             articles,
                                             allMatchingSlugs,
                                         }: {
    articles: QuickArticle[];
    /** Every slug matching the current filter, across all pages — powers "select all". */
    allMatchingSlugs: string[];
}) {
    const router = useRouter();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [isPending, start] = useTransition();

    const pageSlugs = useMemo(() => articles.map((a) => a.slug), [articles]);
    const matchingCount = allMatchingSlugs.length;

    const allPageSelected = pageSlugs.length > 0 && pageSlugs.every((s) => selected.has(s));
    const allMatchingSelected =
        matchingCount > 0 && selected.size >= matchingCount && allMatchingSlugs.every((s) => selected.has(s));

    const count = selected.size;

    const toggle = (slug: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(slug) ? next.delete(slug) : next.add(slug);
            return next;
        });

    const togglePage = () =>
        setSelected((prev) => {
            const next = new Set(prev);
            if (allPageSelected) pageSlugs.forEach((s) => next.delete(s));
            else pageSlugs.forEach((s) => next.add(s));
            return next;
        });

    const selectAllMatching = () => setSelected(new Set(allMatchingSlugs));

    const clear = () => {
        setSelected(new Set());
        setConfirmingDelete(false);
    };

    const runHide = (hidden: boolean) =>
        start(async () => {
            await bulkSetArticlesHidden(Array.from(selected), hidden);
            clear();
            router.refresh();
        });

    const runDelete = () =>
        start(async () => {
            await bulkDeleteArticles(Array.from(selected));
            clear();
            router.refresh();
        });

    return (
        <>
            <div className="ar-bulkhead">
                <label className="ar-check ar-bulk-selpage">
                    <input type="checkbox" checked={allPageSelected} onChange={togglePage} aria-label="Select all on this page" />
                    <span>Select page</span>
                </label>

                {count > 0 && !allMatchingSelected && matchingCount > pageSlugs.length && (
                    <button type="button" className="ar-bulk-selall" onClick={selectAllMatching}>
                        Select all {matchingCount} matching
                    </button>
                )}

                {allMatchingSelected && matchingCount > pageSlugs.length && (
                    <span className="ar-bulk-count">All {matchingCount} selected</span>
                )}
            </div>

            <div className="ar-list">
                {articles.map((a) => (
                    <ArticleRow
                        key={a.slug}
                        article={a}
                        selectable
                        selected={selected.has(a.slug)}
                        onToggleSelect={toggle}
                    />
                ))}
            </div>

            {count > 0 && (
                <div className="ar-bulkbar" role="region" aria-label="Bulk actions">
                    <span className="ar-bulkbar-count">
                        {count} article{count === 1 ? "" : "s"} selected
                    </span>
                    <div className="ar-bulkbar-actions">
                        <button type="button" className="ar-bulk-btn" disabled={isPending} onClick={() => runHide(false)}>
                            Unhide
                        </button>
                        <button type="button" className="ar-bulk-btn" disabled={isPending} onClick={() => runHide(true)}>
                            Hide
                        </button>

                        {confirmingDelete ? (
                            <span className="ar-bulk-confirm">
                                <button type="button" className="ar-bulk-del-yes" disabled={isPending} onClick={runDelete}>
                                    {isPending ? "Deleting…" : `Delete ${count}?`}
                                </button>
                                <button type="button" className="ar-bulk-del-no" disabled={isPending} onClick={() => setConfirmingDelete(false)}>
                                    Cancel
                                </button>
                            </span>
                        ) : (
                            <button type="button" className="ar-bulk-del" disabled={isPending} onClick={() => setConfirmingDelete(true)}>
                                Delete
                            </button>
                        )}

                        <button type="button" className="ar-bulk-clear" disabled={isPending} onClick={clear}>
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}