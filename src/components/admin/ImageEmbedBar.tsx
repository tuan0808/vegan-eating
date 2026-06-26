"use client";
// src/components/admin/ImageEmbedBar.tsx
// Click a thumbnail to drop its <img> tag into the HTML textarea at the cursor.
import type { RefObject } from "react";

const CDN = "https://veganeating-media.nyc3.cdn.digitaloceanspaces.com";

// The brand assets that live in Spaces (emails need absolute URLs + PNG, not SVG).
const EMBED_IMAGES = [
    { label: "Logo", url: `${CDN}/2024/08/logo.png` },
    { label: "Logo (small)", url: `${CDN}/2024/08/logo-150x85.png` },
    { label: "Vegor", url: `${CDN}/2024/02/vegor.png` },
];

function imgTag(url: string, alt: string): string {
    return `<img src="${url}" alt="${alt}" style="max-width:200px;height:auto;display:block" />`;
}

export default function ImageEmbedBar({
    taRef,
    value,
    onChange,
}: {
    taRef: RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (v: string) => void;
}) {
    const insert = (snippet: string) => {
        const ta = taRef.current;
        if (!ta) {
            onChange(value + "\n" + snippet);
            return;
        }
        const start = ta.selectionStart ?? value.length;
        const end = ta.selectionEnd ?? value.length;
        onChange(value.slice(0, start) + snippet + value.slice(end));
        requestAnimationFrame(() => {
            ta.focus();
            const pos = start + snippet.length;
            ta.setSelectionRange(pos, pos);
        });
    };

    return (
        <div className="ns-images">
            <span className="ns-images-label">Insert image</span>
            {EMBED_IMAGES.map((img) => (
                <button
                    type="button"
                    key={img.url}
                    className="ns-img-btn"
                    title={`Insert ${img.label}`}
                    onClick={() => insert(imgTag(img.url, img.label))}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.label} />
                    <span>{img.label}</span>
                </button>
            ))}
        </div>
    );
}
