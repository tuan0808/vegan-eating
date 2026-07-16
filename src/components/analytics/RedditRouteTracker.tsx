// src/components/analytics/RedditRouteTracker.tsx
//
// Fires a Reddit PageVisit on every client-side navigation. The initial load's
// PageVisit is fired by the pixel snippet itself (RedditPixel), so we skip the
// first pathname to avoid double-counting the landing page. Mirrors PageTracker,
// and lives in the (site) layout so only public content counts as a PageVisit.
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { rdtTrack } from "@/components/analytics/reddit-pixel";

export default function RedditRouteTracker() {
    const pathname = usePathname();
    const firstSeen = useRef(false);

    useEffect(() => {
        if (!pathname) return;
        // The snippet already tracked the entry PageVisit; only fire on SPA hops.
        if (!firstSeen.current) {
            firstSeen.current = true;
            return;
        }
        rdtTrack("PageVisit");
    }, [pathname]);

    return null;
}
