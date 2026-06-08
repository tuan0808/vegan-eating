// src/components/ReadingProgress.tsx
"use client";

import { useEffect, useState } from "react";

export default function ReadingProgress() {
    const [pct, setPct] = useState(0);

    useEffect(() => {
        const onScroll = () => {
            const el = document.documentElement;
            const max = el.scrollHeight - el.clientHeight;
            setPct(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);

    return (
        <div
            aria-hidden="true"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                height: 3,
                width: `${pct}%`,
                background: "var(--carrot, #E15A22)",
                zIndex: 1000,
                transition: "width .1s linear",
            }}
        />
    );
}