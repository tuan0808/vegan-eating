"use client";
// src/components/SubstitutionsBrowser.tsx
import { useMemo, useState } from "react";
import type { Sub } from "@/lib/subs";
import "./substitutions-browser.css";

type Item = {
    name: string;       // canonical lowercase key, e.g. "olive oil"
    label: string;      // display, e.g. "Olive Oil"
    aliases: string[];
    subs: Sub[];
    vegan: boolean;
};

export default function SubstitutionsBrowser({ items }: { items: Item[] }) {
    const [q, setQ] = useState("");
    const query = q.trim().toLowerCase();

    // Reactive filter: match the ingredient name, an alias, or any swap name —
    // so "tofu" surfaces the tofu entry and anything that swaps to/from it.
    const filtered = useMemo(() => {
        if (!query) return items;
        return items.filter(
            (it) =>
                it.name.includes(query) ||
                it.label.toLowerCase().includes(query) ||
                it.aliases.some((a) => a.toLowerCase().includes(query)) ||
                it.subs.some((s) => s.name.toLowerCase().includes(query)),
        );
    }, [items, query]);

    return (
        <div className="wrap">
            <div className="subs-page">
                <div className="subs-searchbar">
                    <svg className="subs-search-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-4.3-4.3" />
                    </svg>
                    <input
                        type="search"
                        className="subs-search"
                        placeholder="Search an ingredient — e.g. tofu, butter, eggs…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        aria-label="Search ingredients"
                    />
                    {q ? (
                        <button type="button" className="subs-clear" onClick={() => setQ("")} aria-label="Clear search">×</button>
                    ) : null}
                    <span className="subs-count">
                        {query ? `${filtered.length} of ${items.length}` : `${items.length} ingredients`}
                    </span>
                </div>

                {items.length === 0 ? (
                    <p className="subs-empty">The substitution library is still being built — check back soon.</p>
                ) : filtered.length === 0 ? (
                    <p className="subs-empty">
                        No ingredient matches “{q}”. Try a simpler term — e.g. “milk” instead of “almond milk”.
                    </p>
                ) : (
                    <ul className="subs-list">
                        {filtered.map((it) => (
                            <li key={it.name} className="subs-item">
                                <div className="subs-ing">
                                    <h3>{it.label}</h3>
                                    {!it.vegan ? <span className="subs-flag">make it vegan</span> : null}
                                </div>
                                <div className="subs-swaps">
                                    {it.subs.map((s, i) => (
                                        <span key={i} className="subs-swap">
                                            {s.name}
                                            {s.note ? <em>{s.note}</em> : null}
                                        </span>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
