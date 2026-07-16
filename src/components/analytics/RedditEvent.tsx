// src/components/analytics/RedditEvent.tsx
//
// Fires a single Reddit pixel event once, on mount. A tiny client island that
// server components (recipe/article/news detail, the login page, recipes search)
// can drop in to emit ViewContent / SignUp / Search without becoming client
// components themselves. The ref-guard keeps React 18 StrictMode's double effect
// from firing the event twice in development.
"use client";

import { useEffect, useRef } from "react";
import { rdtTrack, type RedditTrackOpts } from "@/components/analytics/reddit-pixel";
import type { RedditEventName } from "@/lib/reddit-config";

export default function RedditEvent({
    event,
    ...opts
}: { event: RedditEventName } & RedditTrackOpts) {
    const fired = useRef(false);
    useEffect(() => {
        if (fired.current) return;
        fired.current = true;
        rdtTrack(event, opts);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
}
