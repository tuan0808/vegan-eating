// src/app/(app)/admin/recipes/RecipeImport.tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Summary = { mode: string; total: number; created: number; updated: number; unchanged: number; errors: string[] };

export default function RecipeImport() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<Summary | null>(null);
    const [done, setDone] = useState<Summary | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    async function send(f: File, mode: "preview" | "apply") {
        setBusy(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("file", f);
            const res = await fetch(`/api/admin/recipes/import?mode=${mode}`, { method: "POST", body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data?.error || "Import failed.");
            } else if (mode === "preview") {
                setPreview(data);
            } else {
                setDone(data);
                setPreview(null);
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
                router.refresh();
            }
        } catch {
            setError("Import failed — check the file and try again.");
        }
        setBusy(false);
    }

    function choose(f: File | null) {
        setDone(null);
        setPreview(null);
        setError(null);
        setFile(f);
        if (f) send(f, "preview");
    }

    const reset = () => {
        setFile(null);
        setPreview(null);
        setError(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    return (
        <div className="ar-import">
            <button type="button" className="ar-import-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
                ⬆ Import from Excel
            </button>
            <input
                ref={fileRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                hidden
                onChange={(e) => choose(e.target.files?.[0] ?? null)}
            />

            {busy && !preview && <span className="ar-import-status">Reading…</span>}
            {error && <p className="ar-import-error">{error}</p>}

            {preview && (
                <div className="ar-import-panel">
                    <p className="ar-import-head">
                        <b>{file?.name}</b> — {preview.total} row{preview.total === 1 ? "" : "s"} read
                    </p>
                    <ul className="ar-import-counts">
                        <li><b>{preview.updated}</b> to update</li>
                        <li><b>{preview.created}</b> new</li>
                        <li className="muted"><b>{preview.unchanged}</b> unchanged</li>
                    </ul>
                    {preview.errors.length > 0 && (
                        <details className="ar-import-errors">
                            <summary>{preview.errors.length} issue{preview.errors.length === 1 ? "" : "s"}</summary>
                            <ul>{preview.errors.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}</ul>
                        </details>
                    )}
                    <div className="ar-import-actions">
                        <button
                            type="button"
                            className="ar-import-apply"
                            disabled={busy || (preview.created === 0 && preview.updated === 0)}
                            onClick={() => file && send(file, "apply")}
                        >
                            {busy ? "Applying…" : `Apply ${preview.updated + preview.created} change${preview.updated + preview.created === 1 ? "" : "s"}`}
                        </button>
                        <button type="button" className="ar-import-cancel" onClick={reset} disabled={busy}>Cancel</button>
                    </div>
                    {preview.created === 0 && preview.updated === 0 && (
                        <p className="ar-import-note">Nothing to apply — every row matches what's already in the database.</p>
                    )}
                </div>
            )}

            {done && (
                <div className="ar-import-panel ar-import-done">
                    <p>✓ Done — <b>{done.updated}</b> updated, <b>{done.created}</b> new, {done.unchanged} unchanged.</p>
                    {done.errors.length > 0 && (
                        <details className="ar-import-errors">
                            <summary>{done.errors.length} issue{done.errors.length === 1 ? "" : "s"}</summary>
                            <ul>{done.errors.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}</ul>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
}