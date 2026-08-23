"use client";

import { useEffect, useRef } from "react";

/**
 * On mount, ask the browser for the visitor's precise position and hand it back,
 * so the coarse IP guess gets corrected to where they actually are.
 *
 * - Already granted  → resolves silently, no prompt.
 * - First visit      → the browser shows its native permission prompt.
 * - Denied/dismissed → the error path runs and we keep the IP guess untouched;
 *                      the visible "Use my location" button is the way back in.
 *
 * This is the fix for coarse or plain-wrong IP geolocation — most sharply on
 * Starlink and other satellite/CGNAT ISPs, whose addresses egress from a
 * regional POP, so a whole metro reads as one distant city (e.g. all of north
 * Broward geolocating to downtown Miami). Geolocation only resolves in a secure
 * context (https, or http on localhost); anywhere else it hits the error path
 * and the IP guess stands.
 */
export function usePreciseLocation(onLocate: (c: { lat: number; lng: number }) => void): void {
    // Keep the latest callback in a ref so the effect can stay mount-only
    // (empty deps) without going stale — we only want to prompt once per load.
    const cb = useRef(onLocate);
    cb.current = onLocate;

    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;
        let cancelled = false;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (!cancelled) cb.current({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            // Denied / dismissed / unavailable — keep the IP guess; the manual
            // button is the fallback path back to precise location.
            () => {},
            // Coarse is fine and fast here; a cached fix up to 5 min old is plenty
            // to correct a metro-level IP error. The button re-fetches high-accuracy.
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
        );

        return () => {
            cancelled = true;
        };
    }, []);
}
