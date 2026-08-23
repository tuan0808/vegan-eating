"use client";

// Home-page "near me" area: the nearest-few strip and a "10 best by Google
// rating" carousel. Both come from one homeNearby() call, seeded server-side
// from the visitor's IP. While a brand-new area is still being pulled from
// OpenStreetMap (and its ratings resolved) the response is `filling: true`, so
// we show a "finding places…" state and poll until it settles — the same
// treatment as the full tool.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { homeNearby } from "@/lib/actions/places";
import type { NearbyPlace } from "@/lib/places";
import { usePreciseLocation } from "@/lib/use-precise-location";
import PlaceHomeCard from "@/components/PlaceHomeCard";

const RETRY_MS = 2500;
const MAX_RETRIES = 8;
const PER_PAGE = 3;

type Seed = { lat: number; lng: number; label: string };

const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

const Pin = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 21s-7-5.686-7-11a7 7 0 0114 0c0 5.314-7 11-7 11z" /><circle cx="12" cy="10" r="2.6" /></svg>
);

function Skeletons() {
    return (
        <div className="grid" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card">
                    <div className="photo" style={{ marginBottom: 16 }}>
                        <div className="ph nm-skel-photo" style={{ aspectRatio: "4 / 3" }} />
                    </div>
                    <div className="nm-skel-line w40" />
                    <div className="nm-skel-line w70" />
                </div>
            ))}
        </div>
    );
}

export default function HomeNearby({ seed, photos = false }: { seed: Seed | null; photos?: boolean }) {
    const [nearest, setNearest] = useState<NearbyPlace[]>([]);
    const [topRated, setTopRated] = useState<NearbyPlace[]>([]);
    const [filling, setFilling] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [page, setPage] = useState(0);

    // The seed we actually search from. Starts as the server's IP guess and is
    // replaced in-place if the browser can silently hand us a precise position.
    const [activeSeed, setActiveSeed] = useState<Seed | null>(seed);
    // Heading label. Tracks the IP city until a precise refine lands, after which
    // we name the town from the nearest result so it never says "Miami" when the
    // visitor is really in Coral Springs.
    const [label, setLabel] = useState(seed?.label ?? "you");
    const preciseRef = useRef(false);
    // Whether we've moved off the IP guess (drives the fallback button/label) and
    // the manual-button state for visitors who denied or dismissed the prompt.
    const [precise, setPrecise] = useState(false);
    const [geo, setGeo] = useState<"idle" | "locating" | "denied" | "unavailable">("idle");

    const reqId = useRef(0);
    const retries = useRef(0);
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const run = useCallback(
        async (o: Seed, isRetry = false) => {
            if (retryTimer.current) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
            }
            if (!isRetry) retries.current = 0;

            const id = ++reqId.current;
            const res = await homeNearby({ lat: o.lat, lng: o.lng });
            if (id !== reqId.current) return; // superseded
            setLoaded(true);
            if (!res.ok) {
                setFilling(false);
                return;
            }
            setNearest(res.nearest ?? []);
            setTopRated(res.topRated ?? []);
            // After a precise refine we have no reliable city name for the centre,
            // so borrow it from the closest venue — accurate and HappyCow-like.
            if (preciseRef.current) {
                const town = res.nearest?.[0]?.city;
                if (town) setLabel(town);
            }

            const keepPolling = Boolean(res.filling) && retries.current < MAX_RETRIES;
            setFilling(keepPolling);
            if (keepPolling) {
                retries.current += 1;
                retryTimer.current = setTimeout(() => run(o, true), RETRY_MS);
            }
        },
        [],
    );

    useEffect(() => {
        if (activeSeed) run(activeSeed);
        return () => {
            if (retryTimer.current) clearTimeout(retryTimer.current);
        };
    }, [activeSeed, run]);

    // Recenter the search on a precise fix (from the auto-prompt or the button).
    const applyPrecise = useCallback((c: { lat: number; lng: number }) => {
        preciseRef.current = true;
        setPrecise(true);
        setGeo("idle");
        setLabel("you"); // neutral until the refined search names the town
        setActiveSeed({ lat: c.lat, lng: c.lng, label: "you" });
    }, []);

    // Auto-prompt for precise location on load; corrects a coarse/wrong IP city.
    usePreciseLocation(applyPrecise);

    // Manual fallback for anyone who dismissed or denied the prompt — a fresh,
    // high-accuracy fix on click.
    const locate = useCallback(() => {
        if (typeof window !== "undefined" && !window.isSecureContext) return setGeo("unavailable");
        if (typeof navigator === "undefined" || !navigator.geolocation) return setGeo("unavailable");
        setGeo("locating");
        navigator.geolocation.getCurrentPosition(
            (pos) => applyPrecise({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
    }, [applyPrecise]);

    // Nothing to show: no IP seed (localhost/LAN), or the area resolved empty.
    if (!seed) return null;

    const discovering = !loaded || filling;
    const pageCount = Math.ceil(topRated.length / PER_PAGE);
    const shown = topRated.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

    return (
        <>
            {/* ---- Nearest strip ---- */}
            {(nearest.length > 0 || discovering) && (
                <div className="wrap">
                    <section style={{ paddingTop: 0 }}>
                        <div className="sec-head">
                            <div>
                                <span className="kicker" style={{ color: "var(--carrot)" }}>New · find a spot</span>
                                <h2 style={{ marginTop: 10 }}>Vegan food near {label}</h2>
                                {/* Fallback path to precise location for anyone the auto-prompt
                                    didn't catch (dismissed, denied, or on the IP guess still). */}
                                {!precise && geo !== "denied" && (
                                    <button type="button" className="nm-home-locate" onClick={locate} disabled={geo === "locating"}>
                                        <Pin />
                                        {geo === "locating"
                                            ? "Finding you…"
                                            : geo === "unavailable"
                                              ? "Use my location"
                                              : `Not in ${label}? Use my exact location`}
                                    </button>
                                )}
                                {geo === "denied" && (
                                    <span className="nm-home-note">
                                        Location is blocked — enable it in your browser&apos;s address-bar icon, then reload.
                                    </span>
                                )}
                            </div>
                            <Link href="/tools/vegan-food-near-me">Find spots near you <Arrow /></Link>
                        </div>

                        {nearest.length > 0 ? (
                            <div className="grid">
                                {nearest.map((p) => <PlaceHomeCard key={p.id} p={p} photos={photos} />)}
                            </div>
                        ) : (
                            <>
                                <p className="nm-loading" style={{ marginTop: 0, marginBottom: 20 }}>
                                    <span className="nm-spinner" aria-hidden="true" />
                                    Finding vegan places near {label}…
                                </p>
                                <Skeletons />
                            </>
                        )}
                    </section>
                </div>
            )}

            {/* ---- 10 best by Google rating ---- */}
            {topRated.length > 0 && (
                <div className="wrap">
                    <section style={{ paddingTop: 0 }}>
                        <div className="sec-head">
                            <div>
                                <span className="kicker" style={{ color: "var(--carrot)" }}>Top rated · Google</span>
                                <h2 style={{ marginTop: 10 }}>10 best vegan restaurants near {label}</h2>
                            </div>
                            {pageCount > 1 && (
                                <div className="rail-nav">
                                    <button
                                        className="rail-arrow"
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        aria-label="Previous"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 6l-6 6 6 6" /></svg>
                                    </button>
                                    <button
                                        className="rail-arrow"
                                        onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                                        disabled={page >= pageCount - 1}
                                        aria-label="Next"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M9 6l6 6-6 6" /></svg>
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="grid">
                            {shown.map((p, i) => (
                                <div key={p.id} className="rail-item">
                                    <span className="rail-rank">{page * PER_PAGE + i + 1}</span>
                                    <PlaceHomeCard p={p} photos={photos} />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </>
    );
}
