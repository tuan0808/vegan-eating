// src/components/TurnstileWidget.tsx
"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Reusable Cloudflare Turnstile widget. Drop it inside any <form> and it injects
// a hidden `cf-turnstile-response` field that the matching server action reads
// via verifyTurnstile() (see src/lib/turnstile.ts).
//
// Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so forms keep
// working in dev / unconfigured environments — verifyTurnstile() fails open in
// the same case, so the two stay in lockstep: both off, or both on.
//
// Uses EXPLICIT rendering. Implicit rendering (a bare `.cf-turnstile` div) only
// scans the DOM once, when api.js first loads. On a client-side navigation back to
// a form (header link, promo modal, or the ?error= redirect after a failed submit)
// next/script doesn't re-run the already-loaded script, so the div stayed empty,
// no token was posted, and every submit failed with error=captcha. Rendering
// from an effect draws the widget on every mount, and removes it on unmount.

type TurnstileApi = {
    render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    remove: (id: string) => void;
};
declare global {
    interface Window { turnstile?: TurnstileApi }
}

export default function TurnstileWidget({ className }: { className?: string }) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const ref = useRef<HTMLDivElement>(null);
    // Flips when the script finishes loading, so the effect re-runs if the
    // component mounted before api.js was ready (the first-visit case).
    const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.turnstile);

    useEffect(() => {
        const ts = window.turnstile;
        if (!siteKey || !ready || !ts || !ref.current) return;
        const id = ts.render(ref.current, { sitekey: siteKey });
        return () => {
            try { ts.remove(id); } catch { /* widget already gone */ }
        };
    }, [siteKey, ready]);

    if (!siteKey) return null;

    return (
        <>
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive"
                onReady={() => setReady(true)}
            />
            {/* min-height reserves the widget's space so the form doesn't jump as it loads. */}
            <div className={className} style={{ minHeight: 65 }}>
                <div ref={ref} className="cf-turnstile" />
            </div>
        </>
    );
}
