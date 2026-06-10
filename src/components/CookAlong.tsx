// src/components/CookAlong.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./cook-along.css";

type Photo = { src: string; step: number | null };
type Props = { steps: string[]; photos: Photo[]; title: string };

// Normalise a stored path the same way the recipe page does.
function imgSrc(src: string): string {
    const v = (src || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

// Average colour of an image — fast and stable enough to tint a background.
function averageColor(img: HTMLImageElement): string | null {
    try {
        const c = document.createElement("canvas");
        const w = (c.width = 16);
        const h = (c.height = 16);
        const ctx = c.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        if (!n) return null;
        return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
    } catch {
        return null; // tainted canvas etc. — tint just stays at default
    }
}

export default function CookAlong({ steps, photos, title }: Props) {
    // Build: distinct stage images (in step order) + a per-step -> stage-index map.
    const { stageSrcs, stepToStage } = useMemo(() => {
        const assigned = (photos || []).filter(
            (p) => p.step !== null && p.step !== undefined && p.step >= 0 && p.step < steps.length,
        );

        // step index -> src (first photo assigned to a step wins)
        const byStep: (string | undefined)[] = new Array(steps.length).fill(undefined);
        for (const p of assigned) {
            const s = p.step as number;
            if (byStep[s] === undefined) byStep[s] = imgSrc(p.src);
        }

        // distinct stage srcs in step order, with a plain-object index lookup
        const srcs: string[] = [];
        const srcIndex: Record<string, number> = {};
        for (let i = 0; i < byStep.length; i++) {
            const s = byStep[i];
            if (s !== undefined && !(s in srcIndex)) {
                srcIndex[s] = srcs.length;
                srcs.push(s);
            }
        }

        // each step shows its own photo, or carries forward the most recent one
        const map = new Array(steps.length).fill(0);
        let cur = 0;
        for (let i = 0; i < steps.length; i++) {
            const s = byStep[i];
            if (s !== undefined) cur = srcIndex[s];
            map[i] = cur;
        }
        return { stageSrcs: srcs, stepToStage: map };
    }, [photos, steps]);

    const [activeStep, setActiveStep] = useState(0);
    const [colors, setColors] = useState<(string | null)[]>([]);
    const rootRef = useRef<HTMLElement | null>(null);

    // Scroll sync: the step nearest the centre band becomes active.
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const els = Array.from(root.querySelectorAll<HTMLElement>(".ca-step"));
        const ratios = new Map<number, number>();
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    const i = Number(e.target.getAttribute("data-i"));
                    ratios.set(i, e.isIntersecting ? e.intersectionRatio : 0);
                }
                let best = -1, br = 0;
                ratios.forEach((v, k) => { if (v > br) { br = v; best = k; } });
                if (best >= 0 && br > 0) setActiveStep(best);
            },
            { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [stepToStage]);

    if (stageSrcs.length === 0) return null; // no assigned photos -> render nothing

    const activeStage = stepToStage[activeStep] ?? 0;
    const tint = colors[activeStage] || undefined;

    return (
        <section
            className="cookalong"
            ref={rootRef}
            aria-label={`Cook along: ${title}`}
            style={tint ? ({ ["--ca-tint" as string]: tint } as React.CSSProperties) : undefined}
        >
            <div className="ca-head">
                <span className="ca-kicker">Cook along</span>
                <h2 className="ca-title">Watch it come together</h2>
            </div>

            <div className="ca-inner">
                <div className="ca-stage-col">
                    <div className="ca-stage">
                        {stageSrcs.map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                key={src + i}
                                src={src}
                                alt=""
                                className={i === activeStage ? "is-active" : ""}
                                onLoad={(e) => {
                                    const col = averageColor(e.currentTarget);
                                    setColors((prev) => {
                                        if (prev[i] === col) return prev;
                                        const next = [...prev];
                                        next[i] = col;
                                        return next;
                                    });
                                }}
                            />
                        ))}
                    </div>
                </div>

                <ol className="ca-steps">
                    {steps.map((s, idx) => (
                        <li key={idx} data-i={idx} className={`ca-step${idx === activeStep ? " is-current" : ""}`}>
                            <span className="ca-num">{idx + 1}</span>
                            <p>{s}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}