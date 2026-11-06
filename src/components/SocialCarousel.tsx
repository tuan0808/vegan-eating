"use client";

// Home-page lead: a reactive, horizontally-scrolling wall of our Instagram post
// history with recipe cards woven in (see buildSocialFeed). Replaces the old
// featured-recipe Hero to lead with social content. Scroll-snaps, drag-free
// arrow paging, and a frosted gradient caption that blooms on hover — built to
// feel fresh for the client demo. Matches the .rail-arrow look from CitiesRail.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { FeedItem } from "@/lib/social-feed";
import { IG_HANDLE } from "@/lib/instagram";

const IgGlyph = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="2" width="20" height="20" rx="5.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
);
const ForkGlyph = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M6 3v7a2 2 0 0 0 4 0V3M8 10v11M16 3c-1.7 0-3 2-3 5s1.3 4 3 4m0-9v18" strokeLinecap="round" />
    </svg>
);
const Chevron = ({ dir }: { dir: "l" | "r" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d={dir === "l" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
);
const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

function Card({ item }: { item: FeedItem }) {
    const isRecipe = item.kind === "recipe";
    const label = isRecipe ? item.title : item.caption || `@${IG_HANDLE} on Instagram`;
    return (
        <a
            className={`sc-card ${isRecipe ? "is-recipe" : "is-ig"}`}
            href={item.href}
            {...(isRecipe ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            title={label.slice(0, 120)}
        >
            <div className="sc-media">
                {item.image ? (
                    // IG images are pre-proxied absolute URLs; recipe images are
                    // local /public paths. Plain <img> keeps the proxy URL intact.
                    isRecipe ? (
                        <Image src={item.image} alt={label} fill sizes="(max-width:600px) 72vw, 300px" style={{ objectFit: "cover" }} />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={label} loading="lazy" />
                    )
                ) : (
                    <div className={`ph ${item.kind === "recipe" ? item.ph : "p3"}`} />
                )}

                {item.kind === "ig" && item.isVideo && (
                    <span className="sc-play" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                )}

                <span className={`sc-badge ${isRecipe ? "recipe" : "ig"}`}>
                    {isRecipe ? <ForkGlyph size={14} /> : <IgGlyph size={14} />}
                    {isRecipe ? "Recipe" : "Post"}
                </span>

                <div className="sc-veil" aria-hidden="true" />
                <div className="sc-cap">
                    {isRecipe && <span className="sc-tag">{item.tag}</span>}
                    <span className="sc-cap-text">{label}</span>
                </div>
            </div>
        </a>
    );
}

export default function SocialCarousel({ items }: { items: FeedItem[] }) {
    const scroller = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);
    const [scrollable, setScrollable] = useState(false);
    // Auto-scroll state kept in refs so the rAF loop reads live values without
    // re-subscribing: direction ping-pongs at the ends; paused halts it while the
    // pointer is over the rail (hover) or mid drag/swipe.
    const dirRef = useRef(1);
    const pausedRef = useRef(false);

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

    // Gentle auto-scroll. Advances a fraction of a pixel per frame (~24px/s —
    // slow, ambient), reverses at each end, and respects reduced-motion. Pauses
    // via pausedRef (set on hover / drag) so it never fights the user.
    //
    // We track the position in a float accumulator rather than reading
    // el.scrollLeft back each frame: the browser rounds scrollLeft to an integer,
    // so a sub-pixel step would truncate to 0 and never accumulate (the strip
    // would sit still). `pos` keeps the fraction; we only resync from the DOM when
    // the user has scrolled it themselves (swipe / arrows).
    useEffect(() => {
        const el = scroller.current;
        if (!el || !scrollable) return;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
        const SPEED = 0.65; // px per frame
        let raf = 0;
        let pos = el.scrollLeft;
        let lastSet = el.scrollLeft;
        const step = () => {
            if (!pausedRef.current) {
                const max = el.scrollWidth - el.clientWidth;
                if (max > 0) {
                    // User moved it while we weren't driving? Adopt their position.
                    if (Math.abs(el.scrollLeft - lastSet) > 1.5) pos = el.scrollLeft;
                    pos += dirRef.current * SPEED;
                    if (pos >= max) { pos = max; dirRef.current = -1; }
                    else if (pos <= 0) { pos = 0; dirRef.current = 1; }
                    el.scrollLeft = pos;
                    lastSet = el.scrollLeft; // rounded value the DOM actually took
                }
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [scrollable]);

    const pause = () => { pausedRef.current = true; };
    const resume = () => { pausedRef.current = false; };

    const scrollByDir = (dir: number) => {
        const el = scroller.current;
        if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
    };

    if (!items.length) return null;
    const profile = `https://instagram.com/${IG_HANDLE}`;

    return (
        <div className="sc-band">
        <div className="wrap">
            <section className="sc-sec">
                <div className="sec-head">
                    <div>
                        <span className="kicker" style={{ color: "var(--carrot)" }}>
                            <IgGlyph /> @{IG_HANDLE}
                        </span>
                        <h2 style={{ marginTop: 10 }}>Fresh from our kitchen &amp; community</h2>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <a href={profile} target="_blank" rel="noopener noreferrer">Follow <Arrow /></a>
                        {scrollable && (
                            <div className="rail-nav">
                                <button className="rail-arrow" onClick={() => scrollByDir(-1)} disabled={atStart} aria-label="Scroll back">
                                    <Chevron dir="l" />
                                </button>
                                <button className="rail-arrow" onClick={() => scrollByDir(1)} disabled={atEnd} aria-label="Scroll forward">
                                    <Chevron dir="r" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className="sc-rail"
                    ref={scroller}
                    onScroll={update}
                    onMouseEnter={pause}
                    onMouseLeave={resume}
                    onPointerDown={pause}
                    onPointerUp={resume}
                    onPointerCancel={resume}
                >
                    {items.map((it) => <Card key={it.id} item={it} />)}
                </div>
            </section>
        </div>
        </div>
    );
}
