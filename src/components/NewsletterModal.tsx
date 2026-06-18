// src/components/NewsletterModal.tsx
"use client";

import { useState } from "react";
import SubscribeModal from "./SubscribeModal";

// Footer "Newsletter" link. Just a trigger — the modal itself is the shared
// SubscribeModal, so there's no duplicated markup. Renders as an <a> so it
// inherits the footer's .fcol a styling alongside the real links.
export default function NewsletterModal({ label = "Newsletter" }: { label?: string }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <a
                role="button"
                tabIndex={0}
                onClick={() => setOpen(true)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } }}
                style={{ cursor: "pointer" }}
            >
                {label}
            </a>
            <SubscribeModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}