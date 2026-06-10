// src/app/(app)/admin/recipes/[slug]/edit/CookAlongField.tsx
"use client";

import { useRef, useState } from "react";

type Item = { src: string; step: number | null };
type Props = { name: string; initial: Item[]; steps: string[] };

function imgSrc(s: string): string {
    const v = s.trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

export default function CookAlongField({ name, initial, steps }: Props) {
    const [rows, setRows] = useState<Item[]>(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const update = (i: number, patch: Partial<Item>) =>
        setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
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
        const added: Item[] = [];
        for (const f of Array.from(files)) {
            try {
                const fd = new FormData();
                fd.append("file", f);
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) { setError(data?.error || "Upload failed."); continue; }
                if (data?.path) added.push({ src: data.path, step: null });
            } catch {
                setError("Upload failed — check your connection and try again.");
            }
        }
        if (added.length) setRows((r) => [...r, ...added]);
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
    }

    const serialized = JSON.stringify(
        rows.filter((r) => r.src.trim()).map((r) => ({ src: r.src.trim(), step: r.step })),
    );

    return (
        <div className="ar-listfield">
            <span className="ar-field-label">Cook-along photos</span>
            <input type="hidden" name={name} value={serialized} />
            {steps.length === 0 && (
                <p className="ar-hint">Add and save your steps first, then you can attach a photo to each one.</p>
            )}
            <ol className="ar-rows">
                {rows.map((row, i) => (
                    <li className="ar-rowitem" key={i}>
            <span className="ar-rowthumb">
              {row.src.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgSrc(row.src)} alt="" />
              ) : (
                  <span className="ar-rowthumb-empty">🥕</span>
              )}
            </span>
                        <div className="ca-rowmain">
              <textarea
                  className="ar-rowinput"
                  rows={1}
                  value={row.src}
                  placeholder="/uploads/2026/06/photo.jpg"
                  onChange={(e) => update(i, { src: e.target.value })}
              />
                            <select
                                className="ca-stepsel"
                                value={row.step === null ? "" : String(row.step)}
                                onChange={(e) => update(i, { step: e.target.value === "" ? null : Number(e.target.value) })}
                            >
                                <option value="">Unassigned</option>
                                {steps.map((s, idx) => (
                                    <option key={idx} value={idx}>
                                        Step {idx + 1}{s ? ` — ${s.slice(0, 36)}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className="ar-rowctl">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="ar-rowdel" onClick={() => remove(i)} aria-label="Remove photo">×</button>
            </span>
                    </li>
                ))}
            </ol>
            <div className="ar-listactions">
                <button type="button" className="ar-addrow" onClick={() => setRows((r) => [...r, { src: "", step: null }])}>
                    + Add photo
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