// src/app/(app)/admin/recipes/[slug]/edit/RecipeListField.tsx
"use client";

import { useRef, useState } from "react";

type Props = {
    name: string;          // form field name the server action reads (e.g. "steps")
    label: string;         // visible label
    noun: string;          // "step" | "ingredient" | "image" — used on the add button
    initial: string[];     // existing values
    ordered?: boolean;     // true = numbered (steps), false = bulleted (ingredients)
    preview?: boolean;     // true = show an image thumbnail per row (gallery)
    uploadable?: boolean;  // true = show an "Upload images" button (gallery)
    placeholder?: string;
};

// Normalise a bare path ("2025/01/x.jpg" -> "/2025/01/x.jpg") for the thumbnail.
function imgSrc(s: string): string {
    const v = s.trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

export default function RecipeListField({
                                            name, label, noun, initial, ordered = false, preview = false, uploadable = false, placeholder,
                                        }: Props) {
    const [rows, setRows] = useState<string[]>(initial.length ? initial : [""]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const update = (i: number, v: string) =>
        setRows((r) => r.map((row, idx) => (idx === i ? v : row)));
    const add = () => setRows((r) => [...r, ""]);
    const remove = (i: number) =>
        setRows((r) => (r.length === 1 ? [""] : r.filter((_, idx) => idx !== i)));
    const move = (i: number, dir: -1 | 1) =>
        setRows((r) => {
            const j = i + dir;
            if (j < 0 || j >= r.length) return r;
            const next = [...r];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });

    // Upload picked files to /api/upload and append the returned paths as rows.
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
                if (!res.ok) {
                    setError(data?.error || "Upload failed.");
                    continue;
                }
                if (data?.path) added.push(data.path);
            } catch {
                setError("Upload failed — check your connection and try again.");
            }
        }
        if (added.length) {
            setRows((r) => [...r.filter((x) => x.trim()), ...added]);
        }
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
    }

    // One item per line — collapse stray newlines so each row stays a single item.
    const serialized = rows.map((s) => s.replace(/\s*\n\s*/g, " ").trim()).join("\n");

    return (
        <div className="ar-listfield">
            <span className="ar-field-label">{label}</span>
            <input type="hidden" name={name} value={serialized} />
            <ol className="ar-rows">
                {rows.map((row, i) => (
                    <li className="ar-rowitem" key={i}>
                        {preview ? (
                            <span className="ar-rowthumb">
                {row.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgSrc(row)} alt="" />
                ) : (
                    <span className="ar-rowthumb-empty">🥕</span>
                )}
              </span>
                        ) : (
                            <span className="ar-marker">{ordered ? `${i + 1}.` : "•"}</span>
                        )}
                        <textarea
                            className="ar-rowinput"
                            rows={preview ? 1 : 2}
                            value={row}
                            placeholder={placeholder}
                            onChange={(e) => update(i, e.target.value)}
                        />
                        <span className="ar-rowctl">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="ar-rowdel" onClick={() => remove(i)} aria-label={`Remove ${noun}`}>×</button>
            </span>
                    </li>
                ))}
            </ol>

            <div className="ar-listactions">
                <button type="button" className="ar-addrow" onClick={add}>+ Add {noun}</button>
                {uploadable && (
                    <>
                        <button type="button" className="ar-upload" onClick={() => fileRef.current?.click()} disabled={busy}>
                            {busy ? "Uploading…" : "⬆ Upload images"}
                        </button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                    </>
                )}
            </div>
            {error && <p className="ar-upload-error">{error}</p>}
        </div>
    );
}