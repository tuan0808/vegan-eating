// src/components/analytics/RedditPixel.tsx
//
// Loads the Reddit browser pixel once, site-wide, and fires the first PageVisit.
// Mounted in the ROOT layout so `window.rdt` exists on every route group —
// including (auth), where the SignUp conversion fires after the register→login
// redirect. Subsequent client navigations are tracked by RedditRouteTracker.
//
// Renders nothing (and loads nothing) until NEXT_PUBLIC_REDDIT_PIXEL_ID is set,
// so the campaign stays dormant until you paste the id.
"use client";

import Script from "next/script";
import { useEffect } from "react";
import { REDDIT_PIXEL_ID, redditEnabled } from "@/lib/reddit-config";

// Persist Reddit's ad click id (rdt_cid, appended to landing URLs) into a
// first-party cookie so server actions can attach it to CAPI events — it would
// otherwise be lost across the POST→redirect a signup/opt-in performs. 90-day
// window matches Reddit's default click attribution.
function captureClickId() {
    try {
        const cid = new URLSearchParams(window.location.search).get("rdt_cid");
        if (!cid) return;
        document.cookie = `rdt_cid=${encodeURIComponent(cid)}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
    } catch {
        /* ignore — click id is a best-effort match key */
    }
}

export default function RedditPixel() {
    useEffect(() => {
        if (redditEnabled()) captureClickId();
    }, []);

    if (!redditEnabled()) return null;

    return (
        <Script id="reddit-pixel" strategy="afterInteractive">
            {`!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);rdt('init','${REDDIT_PIXEL_ID}');rdt('track','PageVisit');`}
        </Script>
    );
}
