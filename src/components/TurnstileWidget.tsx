// src/components/TurnstileWidget.tsx
"use client";

import Script from "next/script";

// Reusable Cloudflare Turnstile widget. Drop it inside any <form> and it injects
// a hidden `cf-turnstile-response` field that the matching server action reads
// via verifyTurnstile() (see src/lib/turnstile.ts).
//
// Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so forms keep
// working in dev / unconfigured environments — verifyTurnstile() fails open in
// the same case, so the two stay in lockstep: both off, or both on.
export default function TurnstileWidget({ className }: { className?: string }) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) return null;

    return (
        <>
            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
            {/* min-height reserves the widget's space so the form doesn't jump as it loads. */}
            <div className={className} style={{ minHeight: 65 }}>
                <div className="cf-turnstile" data-sitekey={siteKey} />
            </div>
        </>
    );
}
