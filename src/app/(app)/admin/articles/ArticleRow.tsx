// src/app/(app)/admin/articles/ArticleRow.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { quickUpdateArticle } from "./actions";
import ArticleRowActions from "./ArticleRowActions";
import { ARTICLE_CATEGORIES } from "@/lib/categories";

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

const initForm = (a: QuickArticle) => ({
    title: a.title ?? "",
    sourceUrl: a.sourceUrl ?? "",
    date: a.date ?? "",
    image: a.image ?? "",
    category: a.category ?? "",
    tags: (a.tags ?? []).join(", "),
});

const toList = (s: string): string[] => s.split(",").map((t) => t.trim()).filter(Boolean);

export default function ArticleRow({
                                       article,
                                       selectable = false,
                                       selected = false,
                                       onToggleSelect,
                                   }: {
    article: QuickArticle;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (slug: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [f, setF] = useState(() => initForm(article));
    const [isPending, start] = useTransition();

    const editHref = `/admin/articles/${article.slug}/edit`;
    const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setF((s) => ({ ...s, [k]: e.target.value }));

    const save = () =>
        start(async () => {
            await quickUpdateArticle(article.slug, {
                title: f.title.trim(),
                sourceUrl: f.sourceUrl.trim(),
                date: f.date.trim(),
                image: f.image.trim(),
                category: f.category,
                tags: toList(f.tags),
            });
            setExpanded(false);
        });

    const cancel = () => {
        setF(initForm(article));
        setExpanded(false);
    };

    return (
        <div className={`ar-item${article.hidden ? " is-hidden" : ""}${expanded ? " is-editing" : ""}${selected ? " is-selected" : ""}`}>
            {!expanded && <Link href={editHref} className="ar-rowlink" aria-label={`Edit ${article.title}`} />}

            <div className="ar-itemtop">
                {selectable && (
                    <label className="ar-selectbox" title="Select">
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleSelect?.(article.slug)}
                            aria-label={`Select ${article.title}`}
                        />
                    </label>
                )}

                <div className="ar-thumb">
                    {article.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={article.image} alt="" />
                    ) : (
                        <span className="ar-thumb-empty">📄</span>
                    )}
                </div>

                <div className="ar-meta">
          <span className="ar-item-title">
            {article.title}
              {article.hidden && <span className="ar-badge">Hidden</span>}
          </span>
                    <span className="ar-item-sub">
            {article.date || "—"}
                        {article.tags.length ? ` · ${article.tags.join(", ")}` : ""}
          </span>
                </div>

                <div className="ar-item-actions">
                    <button type="button" className="ar-quick" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
                        {expanded ? "Close" : "Quick edit"}
                    </button>
                    <Link href={editHref} className="ar-edit">Edit</Link>
                    <Link href={`/articles/${article.slug}`} target="_blank" className="ar-view">View ↗</Link>
                    <ArticleRowActions slug={article.slug} hidden={article.hidden} />
                </div>
            </div>

            {expanded && (
                <div className="ar-quickedit">
                    <div className="ar-qe-grid">
                        <label className="ar-qe-field ar-qe-wide"><span>Title</span>
                            <input value={f.title} onChange={set("title")} /></label>
                        <label className="ar-qe-field"><span>Date</span>
                            <input value={f.date} onChange={set("date")} /></label>
                        <label className="ar-qe-field ar-qe-wide"><span>Source URL</span>
                            <input value={f.sourceUrl} onChange={set("sourceUrl")} /></label>
                        <label className="ar-qe-field ar-qe-wide"><span>Image path</span>
                            <input value={f.image} onChange={set("image")} placeholder="/uploads/…" /></label>
                        <label className="ar-qe-field"><span>Category</span>
                            <select value={f.category} onChange={set("category")}>
                                <option value="">— None —</option>
                                {ARTICLE_CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select></label>
                        <label className="ar-qe-field ar-qe-wide"><span>Tags <em>(comma-separated)</em></span>
                            <input value={f.tags} onChange={set("tags")} placeholder="air fryer, instant pot, sous-vide" /></label>
                    </div>
                    <div className="ar-qe-actions">
                        <button type="button" className="ar-qe-save" onClick={save} disabled={isPending}>
                            {isPending ? "Saving…" : "Save changes"}
                        </button>
                        <button type="button" className="ar-qe-cancel" onClick={cancel} disabled={isPending}>Cancel</button>
                        <Link href={editHref} className="ar-qe-full-edit">Full editor ↗</Link>
                    </div>
                </div>
            )}
        </div>
    );
}