// src/app/(app)/admin/news/DuplicatesManager.tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteNewsMany } from "./actions";

type Row = {
    slug: string;
    title: string;
    source: string;
    date: string;
    image: string | null;
    dupeOf: string | null;
};

const bar: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    margin: "4px 0 14px",
    padding: "10px 14px",
    background: "#fff",
    border: "1px solid var(--line,#e5e2d6)",
    borderRadius: 10,
};

const delBtn = (disabled: boolean): React.CSSProperties => ({
    background: "#b23b2e",
    color: "#fff",
    border: "none",
    padding: "9px 16px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
});

const itemRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderLeft: "3px solid #c98a1e",
    background: "#fffaf0",
};

export default function DuplicatesManager({ rows }: { rows: Row[] }) {
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [pending, start] = useTransition();
    const router = useRouter();

    const allSelected = rows.length > 0 && sel.size === rows.length;

    const toggle = (slug: string) =>
        setSel((prev) => {
            const next = new Set(prev);
            next.has(slug) ? next.delete(slug) : next.add(slug);
            return next;
        });

    const toggleAll = () => setSel(allSelected ? new Set() : new Set(rows.map((r) => r.slug)));

    const del = () =>
        start(async () => {
            if (!sel.size) return;
            if (!confirm(`Delete ${sel.size} duplicate${sel.size === 1 ? "" : "s"}? This can't be undone.`)) return;
            await deleteNewsMany(Array.from(sel));
            setSel(new Set());
            router.refresh();
        });

    if (!rows.length) return <p className="ar-count">No duplicates flagged. 🎉</p>;

    return (
        <div>
            <div style={bar}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        style={{ width: 18, height: 18, accentColor: "var(--green,#5b6b3f)" }}
                    />
                    Select all ({rows.length})
                </label>
                <button type="button" onClick={del} disabled={pending || sel.size === 0} style={delBtn(pending || sel.size === 0)}>
                    {pending ? "Deleting…" : `Delete selected (${sel.size})`}
                </button>
            </div>

            <div className="ar-list">
                {rows.map((r) => (
                    <div key={r.slug} className="ar-item" style={itemRow}>
                        <input
                            type="checkbox"
                            checked={sel.has(r.slug)}
                            onChange={() => toggle(r.slug)}
                            aria-label={`Select ${r.title}`}
                            style={{ marginLeft: 14, width: 18, height: 18, accentColor: "var(--green,#5b6b3f)", flexShrink: 0 }}
                        />
                        <div className="ar-thumb">
                            {r.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.image} alt="" />
                            ) : (
                                <span className="ar-thumb-empty">📰</span>
                            )}
                        </div>
                        <div className="ar-meta" style={{ flex: 1, minWidth: 0 }}>
                            <span className="ar-item-title">{r.title}</span>
                            <span className="ar-item-sub">
                                {r.date || "—"}
                                {r.source ? ` · ${r.source}` : ""}
                                {r.dupeOf ? ` · duplicate of ${r.dupeOf}` : ""}
                            </span>
                        </div>
                        <Link href={`/news/${r.slug}`} target="_blank" className="ar-view" style={{ marginRight: 14 }}>
                            View ↗
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}