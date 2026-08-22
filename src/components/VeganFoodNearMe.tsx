"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { searchNearby, type CityAnchor } from "@/lib/actions/places";
import { CATEGORIES, TYPES, type PlaceCategory, type PlaceType } from "@/lib/places-osm";
import type { NearbyPlace } from "@/lib/places";
import { usePreciseLocation } from "@/lib/use-precise-location";
import PlacePhoto from "@/components/PlacePhoto";

const CAT_LABELS: Record<PlaceCategory, string> = {
    VEGAN: "Fully vegan",
    VEGETARIAN: "Vegetarian",
    VEG_FRIENDLY: "Veg-friendly",
};

// OSM carries no photos, so each card leads with a category-tinted gradient +
// venue glyph — a clean placeholder, not a stand-in for a real photo.
const CAT_GRAD: Record<PlaceCategory, string> = {
    VEGAN: "linear-gradient(135deg,#5BB35F,#1F5E27)",
    VEGETARIAN: "linear-gradient(135deg,#8FBF6A,#4B7A2F)",
    VEG_FRIENDLY: "linear-gradient(135deg,#F0A65C,#C24817)",
};

function CardGlyph({ type }: { type: PlaceType }) {
    const c = { width: 40, height: 40, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    if (type === "CAFE" || type === "JUICE_BAR")
        return <svg {...c}><path d="M17 8h1a3 3 0 0 1 0 6h-1" /><path d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Z" /><path d="M6 2v2M10 2v2M14 2v2" /></svg>;
    if (type === "BAKERY")
        return <svg {...c}><path d="M4 13a8 5 0 0 1 16 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M8 13v5M12 12v6M16 13v5" /></svg>;
    if (type === "ICE_CREAM")
        return <svg {...c}><path d="M8 10a4 4 0 0 1 8 0Z" /><path d="M8 10l4 10 4-10" /></svg>;
    if (type === "BAR")
        return <svg {...c}><path d="M5 4h14l-7 8Z" /><path d="M12 12v6M8 20h8" /></svg>;
    if (type === "STORE" || type === "MARKET")
        return <svg {...c}><path d="M6 8h12l-1 12H7Z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>;
    return <svg {...c}><path d="M7 2v9M7 11a2 2 0 0 0 2-2V2M11 2v20M17 2c-1.5 1-2 3-2 6s.5 4 2 4v10" /></svg>;
}

const TYPE_LABELS: Record<PlaceType, string> = {
    RESTAURANT: "Restaurant",
    CAFE: "Café",
    FAST_FOOD: "Fast food",
    BAKERY: "Bakery",
    ICE_CREAM: "Ice cream",
    JUICE_BAR: "Juice bar",
    FOOD_TRUCK: "Food truck",
    BAR: "Bar",
    STORE: "Store",
    MARKET: "Market",
    OTHER: "Other",
};

const RADII = [2, 5, 10, 25, 50];

// While a brand-new area is still being pulled from OpenStreetMap, the search
// comes back `filling: true`. We keep a "finding places…" state and re-poll on
// this cadence until results land or we hit the cap (~20s of polling).
const RETRY_MS = 2500;
const MAX_RETRIES = 8;

type Origin = { lat: number; lng: number; label: string };

function fmtDistance(km: number): string {
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function fmtCount(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k` : String(n);
}

// Prefer our own member reviews when we have them; otherwise show the Google
// rating captured alongside the photo. `source` drives the small credit line.
function resolveRating(p: NearbyPlace): { avg: number; count: number; source: "own" | "google" } | null {
    if (p.ratingCount > 0) return { avg: p.ratingAvg, count: p.ratingCount, source: "own" };
    if (p.googleRatingCount && p.googleRating) return { avg: p.googleRating, count: p.googleRatingCount, source: "google" };
    return null;
}

// Five-glyph star row with a fractional final star, mirroring the numeric score.
function Stars({ avg }: { avg: number }) {
    const pct = Math.max(0, Math.min(100, (avg / 5) * 100));
    return (
        <span className="nm-stars" aria-hidden="true">
            <span className="nm-stars-off">★★★★★</span>
            <span className="nm-stars-on" style={{ width: `${pct}%` }}>★★★★★</span>
        </span>
    );
}

function parseCuisines(json: string): string[] {
    try {
        const arr: unknown = JSON.parse(json);
        return Array.isArray(arr) ? arr.map(String).filter(Boolean).slice(0, 3) : [];
    } catch {
        return [];
    }
}

function directionsUrl(p: NearbyPlace): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

export default function VeganFoodNearMe({
    cities,
    initialOrigin,
    photosEnabled = false,
}: {
    cities: CityAnchor[];
    initialOrigin?: Origin;
    photosEnabled?: boolean;
}) {
    // Seed from the server's IP-derived guess so results appear on first paint;
    // the effect below runs the search for it, and "Update my location" refines.
    const [origin, setOrigin] = useState<Origin | null>(initialOrigin ?? null);
    const [geo, setGeo] = useState<"idle" | "locating" | "denied" | "unavailable">("idle");
    const [geoMsg, setGeoMsg] = useState<string | null>(null);

    const [category, setCategory] = useState<PlaceCategory[]>([]);
    const [type, setType] = useState<PlaceType | "">("");
    const [radiusKm, setRadiusKm] = useState(10);
    const [sort, setSort] = useState<"distance" | "rating">("distance");

    const [places, setPlaces] = useState<NearbyPlace[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [filling, setFilling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Guards against out-of-order responses when filters change quickly.
    const reqId = useRef(0);
    // Background-fill poll bookkeeping: how many retries we've fired for the
    // current search, and the pending timer so a new search can cancel it.
    const retries = useRef(0);
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const run = useCallback(
        async (o: Origin, reset: boolean, isRetry = false) => {
            // A fresh search (not a background-fill poll) cancels any pending
            // retry and resets the poll budget.
            if (retryTimer.current) {
                clearTimeout(retryTimer.current);
                retryTimer.current = null;
            }
            if (!isRetry) retries.current = 0;

            const id = ++reqId.current;
            setLoading(true);
            setError(null);
            const offset = reset ? 0 : places.length;
            const res = await searchNearby({
                lat: o.lat,
                lng: o.lng,
                radiusKm,
                category,
                type: type ? [type] : undefined,
                sort,
                offset,
            });
            if (id !== reqId.current) return; // a newer search superseded this one
            if (!res.ok) {
                setError(res.error ?? "Search failed.");
                setLoading(false);
                setFilling(false);
                return;
            }
            setPlaces((prev) => {
                if (reset) return res.places!;
                // Belt-and-suspenders against any paging overlap: never append a
                // place we're already showing, so React keys stay unique.
                const seen = new Set(prev.map((p) => p.id));
                return [...prev, ...res.places!.filter((p) => !seen.has(p.id))];
            });
            setHasMore(Boolean(res.hasMore));
            setLoading(false);

            // The area is still being pulled from OSM in the background — keep
            // the "finding places…" state and poll again shortly, up to the cap,
            // so results appear as soon as the fetch lands. Only page 0 fills.
            const keepPolling = Boolean(res.filling) && reset && retries.current < MAX_RETRIES;
            setFilling(keepPolling);
            if (keepPolling) {
                retries.current += 1;
                retryTimer.current = setTimeout(() => run(o, true, true), RETRY_MS);
            }
        },
        // `places.length` is read fresh via the ref-guarded closure on each call,
        // so it is deliberately not a dependency — including it would rebuild the
        // callback on every append and retrigger the page-0 effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [radiusKm, category, type, sort],
    );

    // Cancel any pending fill-poll when the component unmounts.
    useEffect(() => () => {
        if (retryTimer.current) clearTimeout(retryTimer.current);
    }, []);

    // Re-run page 0 whenever the origin or any filter changes.
    useEffect(() => {
        if (origin) run(origin, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [origin, radiusKm, category, type, sort]);

    // Silently correct the coarse IP seed with the browser's precise position —
    // but only for visitors who've already granted location (no new prompt). The
    // effect that watches `origin` re-runs the search on the tighter centre.
    usePreciseLocation((c) => setOrigin({ lat: c.lat, lng: c.lng, label: "your location" }));

    function locate() {
        setGeoMsg(null);
        // Geolocation is only exposed in a secure context: https, or http on
        // localhost/127.0.0.1. Opened over a plain LAN IP the API is absent, so
        // say so plainly rather than looking frozen.
        if (typeof window !== "undefined" && !window.isSecureContext) {
            setGeo("unavailable");
            setGeoMsg("Your browser only shares location over https or on localhost. Open the site at http://localhost:3000 (not a network IP), then try again.");
            return;
        }
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setGeo("unavailable");
            setGeoMsg("This browser doesn't support location. Pick a city below instead.");
            return;
        }
        setGeo("locating");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGeo("idle");
                setGeoMsg(null);
                setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" });
            },
            (err) => {
                setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
                setGeoMsg(
                    err.code === err.PERMISSION_DENIED
                        ? "Location access is blocked. Allow it for this site in your browser's address-bar icon, then try again."
                        : err.code === err.POSITION_UNAVAILABLE
                          ? "Your device couldn't produce a location fix (location services may be off). Pick a city below instead."
                          : err.code === err.TIMEOUT
                            ? "Locating timed out — try again, or pick a city below."
                            : "We couldn't read your location. Pick a city below instead.",
                );
            },
            // maximumAge 0 forces a fresh fix so "Update my location" never
            // silently reuses a stale cached position.
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
    }

    function pickCity(c: CityAnchor) {
        setGeo("idle");
        setOrigin({ lat: c.lat, lng: c.lng, label: c.city });
    }

    function toggleCategory(c: PlaceCategory) {
        setCategory((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    }

    return (
        <div className="nm">
            {/* ---- Location prompt / controls ---- */}
            <div className="nm-control">
                <button className="nm-locate" onClick={locate} disabled={geo === "locating"}>
                    <PinIcon />
                    {geo === "locating" ? "Finding you…" : origin ? "Update my location" : "Use my location"}
                </button>
                {origin && (
                    <span className="nm-origin">
                        Showing places near <strong>{origin.label}</strong>
                    </span>
                )}
            </div>

            {geoMsg && <p className="nm-note">{geoMsg}</p>}

            {/* ---- City fallback. Shown before any origin is set, and again
                 whenever geolocation fails so the user is never left stuck. ---- */}
            {(!origin || geo === "denied" || geo === "unavailable") && cities.length > 0 && (
                <div className="nm-cities">
                    <span className="nm-cities-label">{origin ? "Jump to a city instead" : "Or jump to a city"}</span>
                    <div className="nm-city-chips">
                        {cities.map((c) => (
                            <button key={`${c.citySlug}-${c.country}`} className="nm-city" onClick={() => pickCity(c)}>
                                {c.city} <span className="nm-city-count">{c.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ---- Filters (only once we have an origin) ---- */}
            {origin && (
                <div className="nm-filters">
                    <div className="nm-chipset" role="group" aria-label="Diet">
                        {CATEGORIES.map((c) => (
                            <button
                                key={c}
                                className={`nm-chip${category.includes(c) ? " is-on" : ""} cat-${c.toLowerCase()}`}
                                onClick={() => toggleCategory(c)}
                                aria-pressed={category.includes(c)}
                            >
                                {CAT_LABELS[c]}
                            </button>
                        ))}
                    </div>

                    <div className="nm-selects">
                        <label className="nm-select">
                            <span>Type</span>
                            <select value={type} onChange={(e) => setType(e.target.value as PlaceType | "")}>
                                <option value="">All types</option>
                                {TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {TYPE_LABELS[t]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="nm-select">
                            <span>Within</span>
                            <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))}>
                                {RADII.map((r) => (
                                    <option key={r} value={r}>
                                        {r} km
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="nm-select">
                            <span>Sort</span>
                            <select value={sort} onChange={(e) => setSort(e.target.value as "distance" | "rating")}>
                                <option value="distance">Nearest</option>
                                <option value="rating">Top rated</option>
                            </select>
                        </label>
                    </div>
                </div>
            )}

            {/* ---- Results ---- */}
            {error && <p className="nm-error">{error}</p>}

            {/* Genuinely nothing here — only once we're neither loading a page nor
                still filling this area from OpenStreetMap in the background. */}
            {origin && !loading && !filling && !error && places.length === 0 && (
                <p className="nm-empty">
                    No spots within {radiusKm} km{category.length || type ? " matching those filters" : ""}. Try a wider
                    radius or clearing filters.
                </p>
            )}

            {places.length > 0 && (
                <ul className="nm-list">
                    {places.map((p) => (
                        <PlaceCard key={p.id} place={p} photos={photosEnabled} />
                    ))}
                </ul>
            )}

            {/* First visit to a new area: the search is (or was just) pulling it
                from OpenStreetMap. Say so and show skeletons while we poll, rather
                than flashing "no spots" before the data lands. */}
            {(loading || filling) && places.length === 0 && (
                <div className="nm-finding">
                    <p className="nm-finding-msg">
                        <span className="nm-spinner" aria-hidden="true" />
                        Finding vegan places near {origin?.label ?? "you"}…
                    </p>
                    <ul className="nm-list" aria-hidden="true">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <li key={i} className="nm-card nm-skel">
                                <div className="nm-photo nm-skel-photo" />
                                <div className="nm-body">
                                    <div className="nm-skel-line w70" />
                                    <div className="nm-skel-line w40" />
                                    <div className="nm-skel-line w90" />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Results already showing, but more may still be arriving. */}
            {(loading || filling) && places.length > 0 && (
                <p className="nm-loading">
                    <span className="nm-spinner" aria-hidden="true" />
                    {filling ? "Finding more places nearby…" : "Searching…"}
                </p>
            )}

            {hasMore && !loading && !filling && origin && (
                <button className="nm-more" onClick={() => run(origin, false)}>
                    Load more
                </button>
            )}
        </div>
    );
}

function PlaceCard({ place: p, photos = false }: { place: NearbyPlace; photos?: boolean }) {
    const cuisines = parseCuisines(p.cuisines);
    const cat = p.category as PlaceCategory;
    const address = [p.address, p.city].filter(Boolean).join(", ");
    const rating = resolveRating(p);
    return (
        <li className={`nm-card cat-${cat.toLowerCase()}`}>
            <div className="nm-photo" style={{ background: CAT_GRAD[cat] ?? CAT_GRAD.VEG_FRIENDLY }}>
                <span className="nm-photo-glyph">
                    <CardGlyph type={p.type as PlaceType} />
                </span>
                {photos && <PlacePhoto placeId={p.id} alt={p.name} />}
                <span className={`nm-photo-chip cat-${cat.toLowerCase()}`}>{CAT_LABELS[cat] ?? cat}</span>
                <span className="nm-photo-dist">{fmtDistance(p.distanceKm)}</span>
            </div>
            <div className="nm-body">
                <div className="nm-card-top">
                    <div>
                        <h3 className="nm-name">{p.name}</h3>
                        <p className="nm-meta">
                            <span className="nm-type">{TYPE_LABELS[p.type as PlaceType] ?? p.type}</span>
                            {rating && (
                                <span className="nm-rating" title={rating.source === "google" ? "Rating from Google" : "Community rating"}>
                                    <span className="nm-rating-num">{rating.avg.toFixed(1)}</span>
                                    <Stars avg={rating.avg} />
                                    <span className="nm-rating-n">({fmtCount(rating.count)})</span>
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {address && <p className="nm-addr">{address}</p>}

                {cuisines.length > 0 && (
                    <div className="nm-cuisines">
                        {cuisines.map((c) => (
                            <span key={c} className="nm-cuisine">
                                {c}
                            </span>
                        ))}
                    </div>
                )}

                <div className="nm-actions">
                    <a className="nm-act" href={directionsUrl(p)} target="_blank" rel="noopener noreferrer">
                        Directions
                    </a>
                    {p.website && (
                        <a className="nm-act" href={p.website} target="_blank" rel="noopener noreferrer">
                            Website
                        </a>
                    )}
                    {p.phone && (
                        <a className="nm-act" href={`tel:${p.phone}`}>
                            Call
                        </a>
                    )}
                </div>
            </div>
        </li>
    );
}

function PinIcon() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}
