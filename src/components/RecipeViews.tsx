// src/components/RecipeViews.tsx
"use client";

import { useEffect, useRef, useState } from "react";

// Count at most one logged view per browser per item per VIEWER per window.
const THROTTLE_MS = 6 * 60 * 60 * 1000; // 6 hours

// Avatar colour classes, cycled across however many faces we show.
const CLS = ["a2", "a3", "a4", "a5"];

export default function RecipeViews({
                                        slug,
                                        kind = "recipe",
                                        count,
                                        initials,
                                        viewerKey = "anon",
                                        log = false,
                                    }: {
    slug: string;
    kind?: "recipe" | "article";
    count: number; // distinct members (floored to 1 server-side)
    initials: string[]; // real member initials, most recent first (or ["V"] baseline)
    viewerKey?: string; // who's viewing (user id / email / "anon") — scopes the throttle
    log?: boolean; // only the detail page logs; the home hero just displays
}) {
    const [c, setC] = useState(count);
    const [faces, setFaces] = useState<string[]>(initials);
    const fired = useRef(false); // guard React StrictMode's double effect in dev

    useEffect(() => {
        if (!log || !slug || fired.current) return;
        fired.current = true;

        // v2 prefix + viewerKey: old "ve:viewed:..." flags are ignored, and each
        // logged-in identity is throttled independently.
        const key = `ve:view:${kind}:${slug}:${viewerKey}`;
        try {
            const last = Number(localStorage.getItem(key) || 0);
            if (Date.now() - last < THROTTLE_MS) return; // already counted recently
            localStorage.setItem(key, String(Date.now())); // set BEFORE fetch so a double-fire can't double-count
        } catch {
            /* localStorage unavailable — just log the view */
        }

        fetch(`/api/${kind}s/${encodeURIComponent(slug)}/view`, { method: "POST" })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d) {
                    if (typeof d.count === "number") setC(d.count);
                    if (Array.isArray(d.initials)) setFaces(d.initials);
                }
            })
            .catch(() => {});
    }, [slug, log, kind, viewerKey]);

    const display = Math.max(1, c);
    const shown = (faces.length ? faces : ["V"]).slice(0, 4);

    const noun =
        kind === "article"
            ? display === 1 ? "reader has" : "readers have"
            : display === 1 ? "cook has" : "cooks have";

    return (
        <div className="hero-social" style={{ marginTop: 22 }}>
            <div className="stack">
                {shown.map((ch, i) => (
                    <span key={i} className={`avatar ${CLS[i % CLS.length]}`}>
            {ch}
          </span>
                ))}
            </div>
            <p>
                <b>{display.toLocaleString()}</b> {noun} viewed this
            </p>
        </div>
    );
}