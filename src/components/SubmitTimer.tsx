// src/components/SubmitTimer.tsx
"use client";

import { useEffect, useRef } from "react";

/**
 * Hidden field that records when the form actually became visible to *this*
 * visitor (set on mount, client-side) — not when the page was rendered/cached.
 * The server compares it against a minimum submit time to reject bot-speed posts.
 */
export default function SubmitTimer({ name = "ts" }: { name?: string }) {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.value = String(Date.now());
    }, []);
    return <input ref={ref} type="hidden" name={name} defaultValue="" aria-hidden="true" />;
}