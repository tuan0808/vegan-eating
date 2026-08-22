"use client";

import { useEffect, useRef } from "react";

/**
 * Silently upgrade a coarse IP-derived location to the browser's precise
 * position — but ONLY when the visitor has already granted geolocation to this
 * site. New visitors never see a prompt: we never call getCurrentPosition unless
 * the permission state is already "granted", so the IP guess stands until they
 * click "Use my location" themselves. Anyone who's allowed it once gets snapped
 * to where they actually are on every later visit, with no prompt.
 *
 * This is the fix for coarse or plain-wrong IP geolocation — most sharply on
 * Starlink and other satellite/CGNAT ISPs, whose addresses egress from a
 * regional POP, so a whole metro reads as one distant city (e.g. all of
 * north Broward geolocating to downtown Miami).
 */
export function usePreciseLocation(onLocate: (c: { lat: number; lng: number }) => void): void {
    // Keep the latest callback in a ref so the effect can stay mount-only
    // (empty deps) without going stale — we only ever want to fire this once.
    const cb = useRef(onLocate);
    cb.current = onLocate;

    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.permissions) return;
        let cancelled = false;

        navigator.permissions
            .query({ name: "geolocation" as PermissionName })
            .then((status) => {
                // "prompt" or "denied" → leave the IP guess untouched and show no
                // prompt. Only a standing "granted" lets us refine silently.
                if (cancelled || status.state !== "granted") return;
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (!cancelled) cb.current({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    },
                    // A granted permission can still fail (location services off,
                    // fix unavailable) — keep the IP guess rather than blanking out.
                    () => {},
                    // Coarse is fine and fast here; a cached fix up to 5 min old is
                    // plenty to correct a metro-level IP error.
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
                );
            })
            // Older Safari's Permissions API doesn't know the "geolocation" name
            // and rejects — silently skip, IP guess stands.
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, []);
}
