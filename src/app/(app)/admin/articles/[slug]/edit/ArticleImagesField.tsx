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

// Hero image only. In-article images now live in the body (added via the editor),
// so this field manages just the banner photo. It still serializes as a single-item
// array under the same `name`, so the server action (images[0] = hero) and the
// edit page are unchanged — saving simply leaves the gallery empty.
export default function ArticleImagesField({ name, initial }: Props) {
    const [hero, setHero] = useState<string>(initial[0]?.trim() || "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    async function handleFile(files: FileList | null) {
        const f = files?.[0];
        if (!f) return;
        setBusy(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append("file", f);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.path) { setError(data?.error || "Upload failed."); return; }
            setHero(String(data.path));
        } catch {
            setError("Upload failed — check your connection and try again.");
        } finally {
            setBusy(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    }

    const serialized = JSON.stringify(hero.trim() ? [hero.trim()] : []);

    return (
        <div className="ar-listfield">
            <span className="ar-field-label">Hero image</span>
            <input type="hidden" name={name} value={serialized} />
            <p className="ar-hint">The banner photo at the top of the article. Images <em>inside</em> the article are added in the editor below.</p>

            <div className="ar-rowitem">
                <span className="ar-rowthumb">
                    {hero.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imgSrc(hero)} alt="" />
                    ) : (
                        <span className="ar-rowthumb-empty">🥕</span>
                    )}
                </span>
                <div className="ar-img-main">
                    <input
                        className="ar-rowinput"
                        type="text"
                        value={hero}
                        placeholder="/uploads/2026/06/photo.jpg"
                        onChange={(e) => setHero(e.target.value)}
                    />
                </div>
                <span className="ar-rowctl">
                    {hero.trim() && (
                        <button type="button" className="ar-rowdel" onClick={() => setHero("")} aria-label="Remove hero image">×</button>
                    )}
                </span>
            </div>

            <div className="ar-listactions">
                <button type="button" className="ar-upload" disabled={busy} onClick={() => fileRef.current?.click()}>
                    {busy ? "Uploading…" : hero.trim() ? "⬆ Replace hero" : "⬆ Upload hero"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files)} />
            </div>
            {error && <p className="ar-upload-error">{error}</p>}
        </div>
    );
}