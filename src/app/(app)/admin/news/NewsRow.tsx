// src/app/(app)/admin/news/NewsRow.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { renameNews } from "./actions";
import NewsRowActions from "./NewsRowActions";
import SelectCheckbox from "@/components/admin/selection/SelectCheckbox";

type Row = {
    slug: string;
    title: string;
    source: string;
    date: string;
    image: string | null;
    hidden: boolean;
    published: boolean;
    categories: string[];
    dupeOf: string | null;
};

const pendingBadge: React.CSSProperties = {
    marginLeft: 8,
    padding: "1px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.02em",
    background: "#e4f2e8",
    color: "#1f6f43",
    border: "1px solid #a8d6ba",
};

const dupeBadge: React.CSSProperties = {
    marginLeft: 8,
    padding: "1px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.02em",
    background: "#fbeccb",
    color: "#8a5a00",
    border: "1px solid #e6c98a",
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

    const isDupe = !!item.dupeOf;
    // A pending story (fetched, not yet approved) that isn't a duplicate — it's
    // waiting in the review queue and stays off the public feed until published.
    const isPendingReview = !item.published && !isDupe;

    return (
        <div
            className={`ar-item${item.hidden ? " is-hidden" : ""}${expanded ? " is-editing" : ""}`}
            style={
                isDupe
                    ? { borderLeft: "3px solid #c98a1e", background: "#fffaf0" }
                    : isPendingReview
                        ? { borderLeft: "3px solid #2f9e63", background: "#f6fbf7" }
                        : undefined
            }
        >
            <div className="ar-itemtop">
                <SelectCheckbox id={item.slug} label={`Select ${item.title}`} style={{ marginLeft: 12 }} />

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
              {isDupe && (
                  <span style={dupeBadge} title={`Exact-title duplicate of /news/${item.dupeOf}`}>
                      ⚑ Duplicate
                  </span>
              )}
              {isPendingReview && (
                  <span style={pendingBadge} title="Awaiting editorial approval — not on the public site yet">
                      ⏳ Pending
                  </span>
              )}
              {item.hidden && !isDupe && item.published && <span className="ar-badge">Hidden</span>}
          </span>
                    <span className="ar-item-sub">
            {item.date || "—"}
                        {item.source ? ` · ${item.source}` : ""}
                        {item.categories.length ? ` · ${item.categories.join(", ")}` : ""}
                        {isDupe ? ` · duplicate of ${item.dupeOf}` : ""}
          </span>
                </div>

                <div className="ar-item-actions">
                    <button type="button" className="ar-quick" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
                        {expanded ? "Close" : "Rename"}
                    </button>
                    <Link href={`/news/${item.slug}`} target="_blank" className="ar-view">View ↗</Link>
                    <NewsRowActions slug={item.slug} hidden={item.hidden} published={item.published} isDupe={isDupe} />
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