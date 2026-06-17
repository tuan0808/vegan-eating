// src/app/articles/[slug]/ShareButtons.tsx
"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";
export default function ShareButtons({ title }: { title: string }) {
    const [url, setUrl] = useState("");
    useEffect(() => { setUrl(window.location.href); }, []);

    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);

    const links = [
        { key: "facebook", label: "Share on Facebook", glyph: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
        { key: "twitter", label: "Share on X", glyph: "𝕏", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}` },
        { key: "linkedin", label: "Share on LinkedIn", glyph: "in", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
        { key: "pinterest", label: "Pin this", glyph: "P", href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}` },
        { key: "email", label: "Share by email", glyph: "✉", href: `mailto:?subject=${t}&body=${u}` },
    ];

    return (
        <div className="art-share">
            <h4 className="art-share-title">Share this article</h4>
            <div className="art-share-row">
                {links.map((l) => (
                    <a
                        key={l.key}
                        className={`art-share-btn sb-${l.key}`}
                        href={l.href}
                        target={l.key === "email" ? undefined : "_blank"}
                        rel="noopener noreferrer"
                        aria-label={l.label}
                    >
                        <span aria-hidden="true">{l.glyph}</span>
                    </a>
                ))}
            </div>
        </div>
    );
}