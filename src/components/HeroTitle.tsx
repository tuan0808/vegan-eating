// src/components/HeroTitle.tsx
"use client";

import { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";

const EM_STYLE: CSSProperties = { fontStyle: "italic", color: "var(--carrot, #E15A22)" };

// Measure line wraps and apply emphasis BEFORE the browser paints, so the
// styling lands in the same frame as hydration instead of flashing in a beat
// after load. useLayoutEffect warns during SSR (no DOM to measure), so fall
// back to useEffect on the server.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function HeroTitle({
                                      title, className, style,
                                  }: {
    title: string;
    className?: string;
    style?: CSSProperties;
}) {
    // "and"/"with" -> "&"; the first word after the first "&" is emphasized.
    const normalized = title.replace(/\b(?:and|with)\b/gi, "&");
    const parts = normalized.split(/(\s+)/); // alternating words + whitespace

    let ampIdx = -1;
    let seenAmp = false;
    for (let i = 0; i < parts.length; i++) {
        if (parts[i] === "&") { seenAmp = true; continue; }
        if (seenAmp && parts[i].trim()) { ampIdx = i; break; }
    }

    const containerRef = useRef<HTMLHeadingElement | null>(null);
    const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const [lineEmph, setLineEmph] = useState<Set<number>>(new Set());

    // After layout, find the first word of each wrapped line and emphasize the
    // first word of every SECOND line (lines 2, 4, ...). Recomputes on resize,
    // since where the text wraps depends on the viewport width.
    useIsoLayoutEffect(() => {
        const fonts = typeof document !== "undefined" ? document.fonts : null;
        // Gate on webfonts being loaded. If we measure wraps while the fallback
        // font is showing, the highlighted words jump when Fraunces swaps in (the
        // "glitch"). Until fonts are ready we render the plain title and emphasize
        // once, measured in the final font — so it never moves.
        let ready = fonts ? fonts.status === "loaded" : true;

        const compute = () => {
            if (!ready) return;
            const firsts: number[] = [];
            let last: number | null = null;
            parts.forEach((p, i) => {
                if (!p.trim()) return;
                const el = wordRefs.current[i];
                if (!el) return;
                const top = Math.round(el.getBoundingClientRect().top);
                if (last === null || Math.abs(top - last) > 4) { firsts.push(i); last = top; }
            });
            const em = new Set<number>();
            for (let ln = 1; ln < firsts.length; ln += 2) em.add(firsts[ln]);
            setLineEmph(em);
        };

        compute();
        if (fonts && !ready) fonts.ready.then(() => { ready = true; compute(); });

        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(compute) : null;
        if (ro && containerRef.current) ro.observe(containerRef.current);
        window.addEventListener("resize", compute);
        return () => { ro?.disconnect(); window.removeEventListener("resize", compute); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title]);

    return (
        <h1 ref={containerRef} className={className} style={style}>
            {parts.map((p, i) => {
                if (!p.trim()) return p; // whitespace, kept verbatim
                // Never style the "&" itself — the line-emphasis can land on a "&"
                // that wraps to the start of a line, and Fraunces' italic ampersand
                // is a fancy "Et" ligature that reads as a garbled glyph. Keep the
                // span, just drop the italic/carrot on ampersands.
                const emphasize = (i === ampIdx || lineEmph.has(i)) && p !== "&";
                return (
                    <span key={i} ref={(el) => { wordRefs.current[i] = el; }} style={emphasize ? EM_STYLE : undefined}>
            {p}
          </span>
                );
            })}
        </h1>
    );
}