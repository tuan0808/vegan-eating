// src/lib/geo-ip.ts
//
// Approximate a visitor's location from their IP, so the "Vegan Food Near Me"
// tool can show local results on first paint — no click, no permission prompt —
// the way HappyCow does. This is coarse (city-level, wrong behind a VPN) and is
// only ever a *default*; the browser Geolocation button refines it.
//
// Results are cached per IP in GeocodeCache (keyed "ip:<addr>") so repeat
// visitors never re-hit the external API, which keeps us well under its free
// rate limit. The lookup is time-boxed so a slow or down provider can never
// stall a page render — on any failure we return null and the UI falls back to
// the manual controls.
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export type IpLocation = { lat: number; lng: number; label: string; city: string; country: string };

const CACHE_TTL_MS = 30 * 864e5; // 30 days — IP→city mappings drift slowly
const FETCH_TIMEOUT_MS = 2500;

// Provider is overridable via env; "{ip}" is substituted. Default is ipwho.is
// (free, HTTPS, no key). Response fields for ipwho.is and ipapi.co are both
// handled by the parser below.
const PROVIDER = process.env.IP_GEO_URL || "https://ipwho.is/{ip}";

/** First forwarded client IP, or null when there isn't one. */
export async function clientIp(): Promise<string | null> {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0].trim() : h.get("x-real-ip");
    return ip || null;
}

/** Loopback / RFC-1918 / link-local — never worth an API call, always local dev or LAN. */
function isPrivate(ip: string): boolean {
    if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return true;
    const m = ip.match(/^172\.(\d+)\./);
    if (m) {
        const n = Number(m[1]);
        if (n >= 16 && n <= 31) return true;
    }
    if (/^f[cd]/i.test(ip) || /^fe80:/i.test(ip)) return true; // IPv6 ULA / link-local
    return false;
}

async function fetchIpLocation(ip: string): Promise<IpLocation | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(PROVIDER.replace("{ip}", encodeURIComponent(ip)), {
            signal: ctrl.signal,
            headers: { accept: "application/json" },
            cache: "no-store",
        });
        if (!res.ok) return null;
        const d = (await res.json()) as Record<string, unknown>;
        if (d.success === false) return null; // ipwho.is error shape

        const lat = Number(d.latitude);
        const lng = Number(d.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        const city = String(d.city ?? "");
        const country = String(d.country ?? d.country_name ?? "");
        const label = [city, country].filter(Boolean).join(", ") || "your area";
        return { lat, lng, label, city, country };
    } catch {
        return null; // timeout / network / parse — caller falls back to manual
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Approximate location for a visitor IP, cached in GeocodeCache. Returns null
 * for private IPs (local dev shows no default — expected) and for any provider
 * failure.
 */
export async function ipLocation(ip: string | null): Promise<IpLocation | null> {
    if (!ip || isPrivate(ip)) return null;
    const key = `ip:${ip}`;

    const cached = await prisma.geocodeCache.findUnique({ where: { query: key } });
    if (cached && Date.now() - cached.createdAt.getTime() < CACHE_TTL_MS) {
        return { lat: cached.lat, lng: cached.lng, label: cached.label, city: cached.city, country: cached.country };
    }

    const loc = await fetchIpLocation(ip);
    if (!loc) return null;

    // Best-effort cache write — a failure here must not break the page.
    try {
        await prisma.geocodeCache.upsert({
            where: { query: key },
            update: { ...loc, createdAt: new Date() },
            create: { query: key, ...loc },
        });
    } catch {
        /* cache is an optimisation, not a requirement */
    }

    return loc;
}
