// src/app/api/instagram/image/route.ts
//
// Streams an Instagram post image through our own origin. Instagram's scontent
// CDN 403s images hotlinked from another domain (a cross-origin Referer), and
// its signed URLs also expire quickly in the browser. Fetching the bytes
// server-side — right after the home page renders a fresh URL — dodges both:
// the request carries no cross-site Referer and the URL is still valid.
//
// The `u` param must be an Instagram/Facebook CDN URL; anything else is
// rejected so this can't be abused as an open proxy (SSRF).
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Hosts Instagram serves media from. Suffix match so subdomains
// (scontent-lax3-1.cdninstagram.com, video-*.fbcdn.net, …) all pass.
const ALLOWED_HOSTS = [".cdninstagram.com", ".fbcdn.net"];

function isAllowed(raw: string): boolean {
    try {
        const url = new URL(raw);
        if (url.protocol !== "https:") return false;
        const host = url.hostname.toLowerCase();
        return ALLOWED_HOSTS.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix));
    } catch {
        return false;
    }
}

export async function GET(req: NextRequest) {
    const target = req.nextUrl.searchParams.get("u");
    if (!target || !isAllowed(target)) return new Response(null, { status: 400 });

    let upstream: Response;
    try {
        // No Referer/Origin sent on a server fetch, so the CDN serves the bytes.
        upstream = await fetch(target, { cache: "no-store" });
    } catch {
        return new Response(null, { status: 502 });
    }
    if (!upstream.ok || !upstream.body) return new Response(null, { status: 404 });

    return new Response(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
            // Transient browser/edge cache only — we don't persist the bytes.
            "Cache-Control": "public, max-age=86400",
        },
    });
}
