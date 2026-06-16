// src/app/(app)/admin/news/NewsRow.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { renameNews } from "./actions";
import NewsRowActions from "./NewsRowActions";

type Row = {
    slug: string;
    title: string;
    source: string;
    date: string;
    image: string | null;
    hidden: boolean;
    categories: string[];
};

export default function NewsRow({ item }: { item: Row }) {
    const [expanded, setExpanded] = useState(false);
    const [title, setTitle] = useState(item.title);
    const [isPending, start] = useTransition();

    const save = () =>
        start(async () => {
            await renameNews(item.slug, title.trim());
            setExpanded(false);
        });

    const cancel = () => {
        setTitle(item.title);
        setExpanded(false);
    };

    return (
        <div className={`ar-item${item.hidden ? " is-hidden" : ""}${expanded ? " is-editing" : ""}`}>
            <div className="ar-itemtop">
                <div className="ar-thumb">
                    {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" />
                    ) : (
                        <span className="ar-thumb-empty">📰</span>
                    )}
                </div>

                <div className="ar-meta">
          <span className="ar-item-title">
            {item.title}
              {item.hidden && <span className="ar-badge">Hidden</span>}
          </span>
                    <span className="ar-item-sub">
            {item.date || "—"}
                        {item.source ? ` · ${item.source}` : ""}
                        {item.categories.length ? ` · ${item.categories.join(", ")}` : ""}
          </span>
                </div>

                <div className="ar-item-actions">
                    <button type="button" className="ar-quick" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
                        {expanded ? "Close" : "Rename"}
                    </button>
                    <Link href={`/news/${item.slug}`} target="_blank" className="ar-view">View ↗</Link>
                    <NewsRowActions slug={item.slug} hidden={item.hidden} />
                </div>
            </div>

            {expanded && (
                <div className="ar-quickedit">
                    <div className="ar-qe-grid">
                        <label className="ar-qe-field ar-qe-wide">
                            <span>Title</span>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} />
                        </label>
                    </div>
                    <div className="ar-qe-actions">
                        <button type="button" className="ar-qe-save" onClick={save} disabled={isPending}>
                            {isPending ? "Saving…" : "Save title"}
                        </button>
                        <button type="button" className="ar-qe-cancel" onClick={cancel} disabled={isPending}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}