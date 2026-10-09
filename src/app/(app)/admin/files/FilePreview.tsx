"use client";

// Thumbnail for a row in Downloads. Images load through /view (role-checked,
// presigned) and open a preview modal; videos get a static placeholder on
// purpose, so nobody starts streaming a multi-GB file from the list.

import { useEffect, useRef, useState } from "react";
import { MAX_THUMB_BYTES, fileKind, type FileKind } from "@/lib/staff-files-config";
import { ghostButton, muted } from "./styles";

const box: React.CSSProperties = {
    width: 48, height: 48, flex: "0 0 48px", borderRadius: 8, overflow: "hidden",
    border: "1px solid var(--line, #e6e3da)", background: "#f4f1e8",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--muted, #6b7264)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.04em",
};

/** Short uppercase extension for the placeholder badge ("MP4", "PDF"). */
export function extLabel(name: string): string {
    const dot = name.lastIndexOf(".");
    return dot > 0 && name.length - dot <= 6 ? name.slice(dot + 1).toUpperCase() : "FILE";
}

export function Placeholder({ kind, name }: { kind: FileKind; name: string }) {
    return (
        <span style={box} aria-hidden title={kind === "video" ? "Video — download to watch" : undefined}>
            {kind === "video" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            ) : (
                extLabel(name)
            )}
        </span>
    );
}

export default function FileThumb({
    id,
    name,
    kind,
    showThumb,
}: {
    id: string;
    name: string;
    kind: FileKind;
    /** False for oversized images: placeholder in the list, still previewable. */
    showThumb: boolean;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    // The full image mounts on first open, so the list never fetches it up front.
    const [opened, setOpened] = useState(false);
    if (kind !== "image") return <Placeholder kind={kind} name={name} />;

    const src = `/api/staff-files/${id}/view`;
    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setOpened(true);
                    dialog.current?.showModal();
                }}
                aria-label={`Preview ${name}`}
                style={{ ...box, padding: 0, cursor: "zoom-in" }}
            >
                {showThumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned redirect, not optimizable
                    <img src={src} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    "IMG"
                )}
            </button>
            <dialog
                ref={dialog}
                // Click on the backdrop (the dialog element itself) closes it.
                onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
                style={{
                    border: 0, borderRadius: 14, padding: 16, maxWidth: "min(1100px, 94vw)",
                    background: "#fffdf7", boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                }}
            >
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <strong style={{ wordBreak: "break-all", flex: 1, fontSize: 14.5 }}>{name}</strong>
                    <a href={`/api/staff-files/${id}/download`} style={{ color: "var(--terra, #c2603a)", fontWeight: 600, fontSize: 14 }}>
                        Download
                    </a>
                    <button type="button" onClick={() => dialog.current?.close()} style={ghostButton}>Close</button>
                </div>
                {opened && <PreviewImage src={src} name={name} />}
            </dialog>
        </>
    );
}

function PreviewImage({ src, name }: { src: string; name: string }) {
    const [failed, setFailed] = useState(false);
    if (failed) return <p style={{ ...muted, margin: "24px 0" }}>Couldn&apos;t load this preview. Try downloading it instead.</p>;
    return (
        // eslint-disable-next-line @next/next/no-img-element -- presigned redirect, not optimizable
        <img
            src={src}
            alt={name}
            onError={() => setFailed(true)}
            style={{
                display: "block", maxWidth: "100%", maxHeight: "80vh", margin: "0 auto",
                objectFit: "contain", background: "repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 50% / 16px 16px",
            }}
        />
    );
}

/** Upload-queue thumbnail from the picked file itself (object URL, nothing fetched). */
export function LocalThumb({ file }: { file: File }) {
    const kind = fileKind(file.type);
    const show = kind === "image" && file.size <= MAX_THUMB_BYTES;
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!show) return;
        const u = URL.createObjectURL(file);
        setUrl(u);
        return () => URL.revokeObjectURL(u);
    }, [file, show]);

    if (!show || !url) return <Placeholder kind={kind} name={file.name} />;
    return (
        <span style={box}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </span>
    );
}
