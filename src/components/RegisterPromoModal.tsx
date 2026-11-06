"use client";

// Timed "register for free" promo for logged-out visitors. Appears a few seconds
// after load, is dismissible (×, backdrop, Escape, "Maybe later"), and remembers
// the dismissal in localStorage so it doesn't nag returning visitors. Never shown
// to logged-in users (session check) and never re-appears within the cooldown.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import "./register-promo.css";

const DELAY_MS = 6000; // show ~6s after load — long enough to read the page first
const DISMISS_KEY = "vn-register-promo-dismissed";
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // suppress for 30 days after dismissal

const Check = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);
const Leaf = () => (
    <svg width="96" height="96" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M21 3S9 3 5 7s-2 11-2 11 7 2 11-2 7-13 7-13Zm-9 9c2-3 5-5 5-5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
);

export default function RegisterPromoModal() {
    const [open, setOpen] = useState(false);

    const dismiss = useCallback(() => {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* storage blocked */ }
        setOpen(false);
    }, []);

    useEffect(() => {
        // Don't show if dismissed within the cooldown window.
        try {
            const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
            if (last && Date.now() - last < COOLDOWN_MS) return;
        } catch { /* storage blocked — fall through and let it show */ }

        let timer: ReturnType<typeof setTimeout> | undefined;
        let active = true;
        // Only logged-out visitors get the promo.
        fetch("/api/auth/session")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!active || (d && d.user)) return;
                timer = setTimeout(() => setOpen(true), DELAY_MS);
            })
            .catch(() => { /* session check failed — stay silent */ });

        return () => { active = false; if (timer) clearTimeout(timer); };
    }, []);

    // Escape to close + lock body scroll while open.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, dismiss]);

    if (!open) return null;

    return (
        <div className="rp-back" onClick={dismiss}>
            <div
                className="rp-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="rp-title"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="rp-x" aria-label="Close" onClick={dismiss}>×</button>

                <div className="rp-banner">
                    <span className="rp-banner-leaf" aria-hidden="true"><Leaf /></span>
                    <span className="rp-kicker">Free membership</span>
                    <h3 className="rp-title" id="rp-title">Join the kitchen — get the good stuff, free.</h3>
                </div>

                <div className="rp-body">
                    <p className="rp-sub">
                        Create a free account for members-only promos and partner deals — plus everything that makes cooking here better.
                    </p>
                    <ul className="rp-perks">
                        <li className="rp-perk"><Check /><span><b>Exclusive promos &amp; discounts</b> from our partners</span></li>
                        <li className="rp-perk"><Check /><span>Save &amp; organize your favorite recipes</span></li>
                        <li className="rp-perk"><Check /><span>Rate and review what you cook</span></li>
                        <li className="rp-perk"><Check /><span>One tested recipe in your inbox each Sunday</span></li>
                    </ul>

                    <Link href="/register" className="rp-cta" onClick={dismiss}>Register for free</Link>
                    <button type="button" className="rp-later" onClick={dismiss}>Maybe later</button>

                    <p className="rp-fine">Already a member? <Link href="/login" onClick={dismiss}>Sign in</Link></p>
                </div>
            </div>
        </div>
    );
}
