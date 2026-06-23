// src/components/analytics/PageTracker.tsx
"use client";

// Fires one pageview beacon per route view — initial load and every client-side
// navigation. Lives in the public (site) layout only, so admin/app pages aren't
// counted. ISR/static pages can't be measured server-side (they render once at
// build/revalidate, not per visitor), which is why this is client-side.
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageTracker() {
    const pathname = usePathname();
    // The first navigation's referrer is the real external source; once we've
    // sent it, later in-app hops should report no referrer (not our own URL).
    const sentFirst = useRef(false);

    useEffect(() => {
        if (!pathname) return;
        const ref = sentFirst.current ? "" : document.referrer || "";
        sentFirst.current = true;

        const body = JSON.stringify({ path: pathname + window.location.search, ref });
        // sendBeacon survives the page unloading mid-navigation; fetch is the
        // fallback when it's unavailable or rejects an oversized payload.
        try {
            const blob = new Blob([body], { type: "application/json" });
            if (!navigator.sendBeacon || !navigator.sendBeacon("/api/track", blob)) {
                fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
            }
        } catch {
            /* analytics must never throw into the app */
        }
    }, [pathname]);

    return null;
}
