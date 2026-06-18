// src/components/SubscribeModal.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { subscribeEmail } from "@/app/actions/newsletter";

// The one and only Subscribe ("The Dispatch") modal. Controlled via open/onClose
// so any trigger can use it — the header and the footer both render this. Owns
// its own email/success/error state, locks scroll + closes on Escape while open,
// and portals to <body> so no ancestor's transform/overflow can clip it.
export default function SubscribeModal({
                                           open,
                                           onClose,
                                       }: {
    open: boolean;
    onClose: () => void;
}) {
    const [email, setEmail] = useState("");
    const [done, setDone] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Fresh form every time it opens.
    useEffect(() => {
        if (open) { setEmail(""); setDone(false); setErr(null); setBusy(false); }
    }, [open]);

    // Lock page scroll + Escape-to-close while open.
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        if (!/.+@.+\..+/.test(value)) { setErr("Enter a valid email address."); return; }
        setErr(null);
        setBusy(true);
        const res = await subscribeEmail(value);
        setBusy(false);
        if (res.ok) setDone(true);
        else setErr(res.error);
    };

    if (!mounted || !open) return null;

    return createPortal(
        <div className="vn-modal-back" onClick={onClose}>
            <div className="vn-modal" role="dialog" aria-modal="true" aria-label="Subscribe to The Dispatch" onClick={(e) => e.stopPropagation()}>
                <button className="vn-modal-x" aria-label="Close" onClick={onClose}>×</button>
                {done ? (
                    <div className="vn-modal-done">
                        <div className="vn-modal-check">✓</div>
                        <h3>You're on the list.</h3>
                        <p>The next Dispatch will land in your inbox. No spam, no ads — ever.</p>
                        <button className="vn-sub" onClick={onClose}>Done</button>
                    </div>
                ) : (
                    <>
                        <span className="vn-modal-kicker">The Dispatch, in your inbox</span>
                        <h3>New recipes &amp; notes, once a week</h3>
                        <p>The good stuff from the kitchen and the forum — a short weekly email. No ads, no selling your address, unsubscribe in one click.</p>
                        <form onSubmit={submit} className="vn-modal-form">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                aria-label="Email address"
                                required
                            />
                            <button type="submit" className="vn-sub" disabled={busy}>{busy ? "Subscribing…" : "Subscribe"}</button>
                        </form>
                        {err && <p style={{ color: "#c0392b", margin: "10px 0 0", fontSize: 14 }}>{err}</p>}
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}