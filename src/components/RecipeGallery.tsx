// src/components/RecipeGallery.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./recipe-gallery.css";

// Normalise a bare path ("2025/01/x.jpg" -> "/2025/01/x.jpg").
function imgSrc(s: string): string {
    const v = (s || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

export default function RecipeGallery({ images, title }: { images: string[]; title: string }) {
    const pics = (images || []).map(imgSrc).filter(Boolean);
    const [open, setOpen] = useState<number | null>(null);
    const touchX = useRef<number | null>(null);

    const close = useCallback(() => setOpen(null), []);
    const go = useCallback(
        (dir: 1 | -1) =>
            setOpen((i) => (i === null ? i : (i + dir + pics.length) % pics.length)),
        [pics.length],
    );

    // Keyboard nav + scroll lock while the lightbox is open.
    useEffect(() => {
        if (open === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowRight") go(1);
            else if (e.key === "ArrowLeft") go(-1);
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, close, go]);

    if (pics.length === 0) return null;
    const layout = pics.length === 1 ? "solo" : pics.length === 2 ? "duo" : "grid";

    return (
        <>
            <section className="recipe-gallery">
                <div className="rg-head">
                    <span className="rg-kicker">From the kitchen</span>
                    <span className="rg-rule" />
                    <span className="rg-count">{pics.length} photo{pics.length === 1 ? "" : "s"}</span>
                </div>
                <div className={`rg-frames rg-${layout}`}>
                    {pics.map((src, i) => (
                        <button
                            type="button"
                            key={i}
                            className="rg-frame"
                            onClick={() => setOpen(i)}
                            aria-label={`${title} — open photo ${i + 1}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={`${title} — photo ${i + 1}`} loading="lazy" />
                        </button>
                    ))}
                </div>
            </section>

            {open !== null && (
                <div
                    className="rg-lightbox"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${title} photos`}
                    onClick={close}
                    onTouchStart={(e) => {
                        touchX.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                        if (touchX.current == null) return;
                        const dx = e.changedTouches[0].clientX - touchX.current;
                        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
                        touchX.current = null;
                    }}
                >
                    <button className="rg-lb-close" onClick={close} aria-label="Close" autoFocus>×</button>

                    {pics.length > 1 && (
                        <button
                            className="rg-lb-nav rg-lb-prev"
                            onClick={(e) => { e.stopPropagation(); go(-1); }}
                            aria-label="Previous photo"
                        >‹</button>
                    )}

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        className="rg-lb-img"
                        src={pics[open]}
                        alt={`${title} — photo ${open + 1}`}
                        onClick={(e) => e.stopPropagation()}
                    />

                    {pics.length > 1 && (
                        <button
                            className="rg-lb-nav rg-lb-next"
                            onClick={(e) => { e.stopPropagation(); go(1); }}
                            aria-label="Next photo"
                        >›</button>
                    )}

                    <div className="rg-lb-caption" onClick={(e) => e.stopPropagation()}>
                        <span className="rg-lb-title">{title}</span>
                        <span className="rg-lb-count">{open + 1} / {pics.length}</span>
                    </div>
                </div>
            )}
        </>
    );
}