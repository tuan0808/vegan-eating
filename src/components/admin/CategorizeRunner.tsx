"use client";
// src/components/admin/CategorizeRunner.tsx
import { useState, useTransition } from "react";
import { previewCategorize, applyCategorize } from "@/lib/actions/categories";
import type { ScanResult } from "@/lib/categorize";

export default function CategorizeRunner() {
    const [scan, setScan] = useState<ScanResult | null>(null);
    const [applied, setApplied] = useState<string | null>(null);
    const [mode, setMode] = useState<"preview" | "apply" | null>(null);
    const [pending, start] = useTransition();

    const runPreview = () => {
        setMode("preview");
        setApplied(null);
        start(async () => {
            setScan(await previewCategorize());
            setMode(null);
        });
    };

    const runApply = () => {
        setMode("apply");
        start(async () => {
            const r = await applyCategorize();
            setApplied(r.message);
            setScan(await previewCategorize()); // refresh the now-empty buckets
            setMode(null);
        });
    };

    const willAssign = scan ? scan.buckets.reduce((n, b) => n + b.titles.length, 0) : 0;

    return (
        <div className="cat-tool">
            <div className="cat-tool-actions">
                <button type="button" className="as-save" onClick={runPreview} disabled={pending}>
                    {pending && mode === "preview" ? "Scanning…" : "Preview"}
                </button>
                <button
                    type="button"
                    className="as-save"
                    onClick={runApply}
                    disabled={pending || !scan || willAssign === 0}
                    style={{ background: willAssign ? "var(--terra,#2F7D38)" : undefined }}
                    title={!scan ? "Run a preview first" : willAssign === 0 ? "Nothing to assign" : ""}
                >
                    {pending && mode === "apply" ? "Applying…" : `Apply${willAssign ? ` (${willAssign})` : ""}`}
                </button>
                {applied ? <span className="as-flash ok" role="status">✓ {applied}</span> : null}
            </div>

            {scan ? (
                <div className="cat-scan">
                    <p className="cat-scan-summary">
                        {scan.total} recipes · {scan.alreadyCategorized} already categorized ·{" "}
                        <b>{willAssign}</b> would be assigned · {scan.naCount} left NA{" "}
                        <span className="muted">({scan.naSub30} of those are sub-30 so still show under Weeknight in 30)</span>
                    </p>
                    <div className="cat-scan-grid">
                        {scan.buckets.map((b) => (
                            <div key={b.slug} className="cat-scan-bucket">
                                <div className="cat-scan-bucket-head">
                                    <b>{b.slug}</b> <span>{b.titles.length}</span>
                                </div>
                                <ul>
                                    {b.titles.slice(0, 5).map((t) => <li key={t.id}>{t.title}</li>)}
                                    {b.titles.length > 5 ? <li className="muted">…+{b.titles.length - 5} more</li> : null}
                                    {b.titles.length === 0 ? <li className="muted">none</li> : null}
                                </ul>
                            </div>
                        ))}
                        <div className="cat-scan-bucket">
                            <div className="cat-scan-bucket-head"><b>NA (uncategorized)</b> <span>{scan.naCount}</span></div>
                            <ul>
                                {scan.naTitles.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}
                                {scan.naCount > 5 ? <li className="muted">…+{scan.naCount - 5} more</li> : null}
                            </ul>
                        </div>
                    </div>
                    <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                        Apply only writes recipes whose category is still empty — manual categories are never overwritten.
                    </p>
                </div>
            ) : (
                <p className="muted" style={{ fontSize: 13 }}>Run a preview to see what each rule would assign before writing.</p>
            )}
        </div>
    );
}
