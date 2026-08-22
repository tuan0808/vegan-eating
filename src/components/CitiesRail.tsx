// src/components/CitiesRail.tsx
"use client";

// Home "Top vegan friendly cities" as a horizontal rail: 3 across on desktop,
// scrolled a page at a time by the left/right arrows (arrows hide when there's
// nothing to scroll, and disable at each end). Reuses the .rail-arrow styling
// from the near-me rail for a consistent look.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import CityCard from "@/components/CityCard";
import type { CityAnchor } from "@/lib/actions/places";

const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
const Chevron = ({ dir }: { dir: "l" | "r" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d={dir === "l" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
);

export default function CitiesRail({ cities }: { cities: CityAnchor[] }) {
    const scroller = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);
    const [scrollable, setScrollable] = useState(false);

    const update = useCallback(() => {
        const el = scroller.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setScrollable(max > 4);
        setAtStart(el.scrollLeft <= 4);
        setAtEnd(el.scrollLeft >= max - 4);
    }, []);

    useEffect(() => {
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [update]);

    const scrollByDir = (dir: number) => {
        const el = scroller.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
    };

    return (
        <div className="wrap">
            <section style={{ paddingTop: 0 }}>
                <div className="sec-head">
                    <div>
                        <span className="kicker" style={{ color: "var(--carrot)" }}>Where to eat</span>
                        <h2 style={{ marginTop: 10 }}>Top vegan friendly cities</h2>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Link href="/vegan-friendly-cities">View more <Arrow /></Link>
                        {scrollable && (
                            <div className="rail-nav">
                                <button className="rail-arrow" onClick={() => scrollByDir(-1)} disabled={atStart} aria-label="Previous cities">
                                    <Chevron dir="l" />
                                </button>
                                <button className="rail-arrow" onClick={() => scrollByDir(1)} disabled={atEnd} aria-label="Next cities">
                                    <Chevron dir="r" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="city-rail" ref={scroller} onScroll={update}>
                    {cities.map((c, i) => (
                        <CityCard key={`${c.citySlug}-${c.country}`} city={c} index={i} />
                    ))}
                </div>
            </section>
        </div>
    );
}
