// src/components/MethodSteps.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./method-steps.css";

type Photo = { src: string; step: number | null };
type Props = { steps: string[]; photos: Photo[] };

function imgSrc(src: string): string {
    const v = (src || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

export default function MethodSteps({ steps, photos }: Props) {
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
            <ol className="steps method-steps">
                {steps.map((s, i) => {
                    const photo = stepPhoto[i];
                    return (
                        <li key={i}>
                            <div className={`ms-row${photo ? " has-photo" : ""}`}>
                                <p>{s}</p>
                                {photo ? (
                                    <button
                                        type="button"
                                        className="ms-thumb"
                                        onClick={() => openFor(i)}
                                        aria-label={`View photo for step ${i + 1}`}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photo} alt={`Step ${i + 1}`} loading="lazy" />
                                        <span className="ms-thumb-zoom" aria-hidden="true">⤢</span>
                                    </button>
                                ) : null}
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