// src/components/analytics/reddit-pixel.ts
//
// Thin, SSR-safe wrapper around the Reddit browser pixel global (`window.rdt`).
// Every call no-ops when the pixel hasn't loaded (id unset, still downloading,
// or blocked), so callers never have to guard.
"use client";

import { redditEnabled, type RedditEventName } from "@/lib/reddit-config";

// The pixel installs a queue-backed function; it's callable before the script
// finishes loading (calls buffer, then flush on load).
type Rdt = (...args: unknown[]) => void;
declare global {
    interface Window {
        rdt?: Rdt;
    }
}

/** Track metadata Reddit accepts on conversion events (all optional). */
export type RedditTrackOpts = {
    /** Shared with the server CAPI twin so Reddit de-dupes the pair. */
    conversionId?: string;
    currency?: string;
    value?: number;
    itemCount?: number;
    products?: Array<{ id?: string; name?: string; category?: string }>;
    customEventName?: string;
};

// Browser events that get a Conversions API twin via /api/reddit-event. SignUp
// and Lead are excluded — their server twins are sent from the server actions
// that have the email.
const RELAYED: ReadonlySet<RedditEventName> = new Set(["PageVisit", "ViewContent", "Search"]);

/** Beacon an event to our own origin so the server forwards it to Reddit CAPI
 *  with the same conversion id. Survives ad-blockers that block pixel.js. */
function relayToCapi(event: RedditEventName, conversionId: string): void {
    try {
        const body = JSON.stringify({ event, conversionId });
        if (navigator.sendBeacon?.("/api/reddit-event", new Blob([body], { type: "application/json" }))) return;
        void fetch("/api/reddit-event", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
    } catch {
        /* best-effort */
    }
}

/** Fire a Reddit standard event from the browser (and, for PageVisit /
 *  ViewContent / Search, its server-side CAPI twin). Safe to call anywhere. */
export function rdtTrack(event: RedditEventName, opts: RedditTrackOpts = {}): void {
    if (typeof window === "undefined" || !redditEnabled()) return;
    if (RELAYED.has(event)) {
        opts = { ...opts, conversionId: opts.conversionId || newConversionId() };
        relayToCapi(event, opts.conversionId!);
    }
    if (typeof window.rdt !== "function") return;
    const payload: Record<string, unknown> = {};
    if (opts.conversionId) payload.conversionId = opts.conversionId;
    if (opts.currency) payload.currency = opts.currency;
    if (typeof opts.value === "number") payload.value = opts.value;
    if (typeof opts.itemCount === "number") payload.itemCount = opts.itemCount;
    if (opts.products) payload.products = opts.products;
    if (opts.customEventName) payload.customEventName = opts.customEventName;
    try {
        window.rdt("track", event, payload);
    } catch {
        /* a marketing beacon must never throw into the app */
    }
}

/** Best-effort client uuid for pixel↔CAPI dedup — uses crypto when available. */
export function newConversionId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `rc_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}
