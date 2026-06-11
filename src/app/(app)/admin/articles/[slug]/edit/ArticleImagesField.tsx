// src/app/(app)/admin/articles/[slug]/edit/ArticleImagesField.tsx
"use client";

import { useRef, useState } from "react";

type Props = { name: string; initial: string[] };

function imgSrc(s: string): string {
    const v = s.trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

export default function ArticleImagesField({ name, initial }: Props) {
    const [rows, setRows] = useState<string[]>(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const update = (i: number, val: string) =>
        setRows((r) => r.map((row, idx) => (idx === i ? val : row)));
    const remove = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
    const move = (i: number, dir: -1 | 1) =>
        setRows((r) => {
            const j = i + dir;
            if (j < 0 || j >= r.length) return r;
            const next = [...r];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });

    async function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        setBusy(true);
        setError(null);
        const added: string[] = [];
        for (const f of Array.from(files)) {
            try {
                const fd = new FormData();
                fd.append("file", f);
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) { setError(data?.error || "Upload failed."); continue; }
                if (data?.path) added.push(data.path);
            } catch {
                setError("Upload failed — check your connection and try again.");
            }
        }
        if (added.length) setRows((r) => [...r, ...added]);
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
    }

    // First non-empty image is the hero; the rest are the article gallery.
    const serialized = JSON.stringify(rows.map((s) => s.trim()).filter(Boolean));

    return (
        <div className="ar-listfield">
            <span className="ar-field-label">Images</span>
            <input type="hidden" name={name} value={serialized} />
            <p className="ar-hint">The first image is the hero. Any others appear in the article below it. Drag order with ↑ ↓.</p>
            <ol className="ar-rows">
                {rows.map((src, i) => (
                    <li className="ar-rowitem" key={i}>
            <span className="ar-rowthumb">
              {src.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgSrc(src)} alt="" />
              ) : (
                  <span className="ar-rowthumb-empty">🥕</span>
              )}
            </span>
                        <div className="ar-img-main">
                            {i === 0 && <span className="ar-hero-badge">Hero image</span>}
                            <input
                                className="ar-rowinput"
                                type="text"
                                value={src}
                                placeholder="/uploads/2026/06/photo.jpg"
                                onChange={(e) => update(i, e.target.value)}
                            />
                        </div>
                        <span className="ar-rowctl">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="ar-rowdel" onClick={() => remove(i)} aria-label="Remove image">×</button>
            </span>
                    </li>
                ))}
            </ol>
            <div className="ar-listactions">
                <button type="button" className="ar-addrow" onClick={() => setRows((r) => [...r, ""])}>
                    + Add image
                </button>
                <button type="button" className="ar-upload" disabled={busy} onClick={() => fileRef.current?.click()}>
                    {busy ? "Uploading…" : "⬆ Upload images"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            </div>
            {error && <p className="ar-upload-error">{error}</p>}
        </div>
    );
}