// src/components/MethodSteps.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractTimer, stepIngredientIndices } from "@/lib/recipe-scale";
import "./method-steps.css";

type Photo = { src: string; step: number | null };
type Props = {
    steps: string[];
    photos: Photo[];
    /** Optional — when passed, each step shows quiet chips for the ingredients it uses
     *  (these become the tap target for substitutions later). Omit to hide chips. */
    ingredients?: string[];
};

function imgSrc(src: string): string {
    const v = (src || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

// "1200" -> "20 min", under a minute -> seconds, over an hour -> "1 hr 10 min".
function timeLabel(secs: number): string {
    if (secs < 60) return `${secs} sec`;
    const m = Math.round(secs / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} hr ${r} min` : `${h} hr`;
}

// Turn a full ingredient line into a short chip label:
// "2 cloves garlic, minced" -> "Garlic"  ·  "1 cup split peas, rinsed" -> "Split peas"
function chipLabel(line: string): string {
    let s = (line || "").toLowerCase();
    s = s.replace(/\([^)]*\)/g, " ");                                   // drop parentheticals
    s = s.split(",")[0];                                                // drop prep clause after first comma
    s = s.replace(/^[\s\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.\-\u2013]+/, "");           // strip a leading amount
    s = s.replace(
        /^\s*(kilograms?|kgs?|kg|grams?|g|millilitres?|milliliters?|mls?|ml|litres?|liters?|l|ounces?|oz|pounds?|lbs?|lb|fluid\s*ounces?|fl\s*oz|tablespoons?|tbsps?|tbsp|teaspoons?|tsps?|tsp|cups?|cup|cloves?|cans?|tins?|pinch(?:es)?|handfuls?|pieces?)\b\.?\s*/i,
        "",
    );                                                                  // strip a leading unit word
    s = s.trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : line;
}

export default function MethodSteps({ steps, photos, ingredients }: Props) {
    // step index -> first photo assigned to it
    const stepPhoto: (string | undefined)[] = new Array(steps.length).fill(undefined);
    for (const p of photos || []) {
        if (
            p.step !== null && p.step !== undefined &&
            p.step >= 0 && p.step < steps.length &&
            stepPhoto[p.step] === undefined
        ) {
            stepPhoto[p.step] = imgSrc(p.src);
        }
    }

    // ordered list of step photos, for lightbox navigation
    const shots: { step: number; src: string }[] = [];
    for (let i = 0; i < steps.length; i++) {
        if (stepPhoto[i]) shots.push({ step: i, src: stepPhoto[i] as string });
    }

    const [open, setOpen] = useState<number | null>(null); // index into shots
    const touchX = useRef<number | null>(null);

    const close = useCallback(() => setOpen(null), []);
    const prev = useCallback(
        () => setOpen((o) => (o === null ? o : (o - 1 + shots.length) % shots.length)),
        [shots.length],
    );
    const next = useCallback(
        () => setOpen((o) => (o === null ? o : (o + 1) % shots.length)),
        [shots.length],
    );

    useEffect(() => {
        if (open === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowLeft") prev();
            else if (e.key === "ArrowRight") next();
        };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, close, prev, next]);

    const openFor = (stepIdx: number) => {
        const idx = shots.findIndex((s) => s.step === stepIdx);
        if (idx >= 0) setOpen(idx);
    };

    return (
        <>
            <ol className="method-steps">
                {steps.map((s, i) => {
                    const photo = stepPhoto[i];
                    const secs = extractTimer(s);
                    const used = ingredients ? stepIngredientIndices(s, ingredients) : [];
                    const hasMeta = secs != null || used.length > 0;
                    return (
                        <li key={i}>
                            <span className="ms-node">{i + 1}</span>
                            <div className="ms-card">
                                <div className={`ms-body${photo ? "" : " no-photo"}`}>
                                    <div className="ms-text">
                                        <p>{s}</p>
                                        {hasMeta ? (
                                            <div className="ms-meta">
                                                {secs != null ? (
                                                    <span className="ms-time">⏱ {timeLabel(secs)}</span>
                                                ) : null}
                                                {used.map((idx) => (
                                                    <span key={idx} className="ms-chip">
                                                        {chipLabel((ingredients as string[])[idx])}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                    {photo ? (
                                        <button
                                            type="button"
                                            className="ms-figure"
                                            onClick={() => openFor(i)}
                                            aria-label={`View photo for step ${i + 1}`}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={photo} alt={`Step ${i + 1}`} loading="lazy" />
                                            <span className="ms-thumb-zoom" aria-hidden="true">⤢</span>
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>

            {open !== null && shots[open] ? (
                <div className="ms-lb" role="dialog" aria-modal="true" onClick={close}>
                    <button className="ms-lb-close" onClick={close} aria-label="Close">×</button>
                    {shots.length > 1 ? (
                        <button
                            className="ms-lb-nav ms-lb-prev"
                            onClick={(e) => { e.stopPropagation(); prev(); }}
                            aria-label="Previous"
                        >‹</button>
                    ) : null}
                    <figure
                        className="ms-lb-figure"
                        onClick={(e) => e.stopPropagation()}
                        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
                        onTouchEnd={(e) => {
                            if (touchX.current === null) return;
                            const dx = e.changedTouches[0].clientX - touchX.current;
                            if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
                            touchX.current = null;
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shots[open].src} alt={`Step ${shots[open].step + 1}`} />
                        <figcaption>
                            <b>Step {shots[open].step + 1}</b>
                            <span>{steps[shots[open].step]}</span>
                            {shots.length > 1 ? <em>{open + 1} / {shots.length}</em> : null}
                        </figcaption>
                    </figure>
                    {shots.length > 1 ? (
                        <button
                            className="ms-lb-nav ms-lb-next"
                            onClick={(e) => { e.stopPropagation(); next(); }}
                            aria-label="Next"
                        >›</button>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}