// src/app/articles/[slug]/ArticleFigure.tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";
function imgSrc(src: string): string {
    const v = src.trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

export default function ArticleFigure({ src, className, sizes }: { src: string; className: string; sizes: string }) {
    const [open, setOpen] = useState(false);
    const s = imgSrc(src);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!s) return null;

    return (
        <>
            <figure className={className}>
                <button type="button" className="art-imgframe art-imgbtn" onClick={() => setOpen(true)} aria-label="Enlarge image">
                    <Image src={s} alt="" fill sizes={sizes} style={{ objectFit: "cover" }} />
                    <span className="art-zoom" aria-hidden="true">⤢</span>
                </button>
            </figure>

            {open && (
                <div className="art-lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
                    <button type="button" className="art-lightbox-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s} alt="" className="art-lightbox-img" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </>
    );
}