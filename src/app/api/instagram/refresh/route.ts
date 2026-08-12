// src/app/api/instagram/refresh/route.ts
//
// Rotates the long-lived Instagram token before it expires and persists the
// fresh one to the Setting KV table (see src/lib/instagram.ts). Mirrors the
// CRON_SECRET guard used by /api/news/sync. The home page also refreshes the
// token lazily on read, so this route is a belt-and-suspenders trigger you can
// point any external scheduler at (or hit by hand near expiry).
import { NextResponse } from "next/server";
import { refreshInstagramToken } from "@/lib/instagram";

export const dynamic = "force-dynamic"; // never cache the refresh endpoint

async function handler(req: Request) {
    const secret = process.env.CRON_SECRET;
    const provided = req.headers.get("authorization");
    const isProd = process.env.NODE_ENV === "production";

    // Production: a secret is mandatory and must match. Development: allowed
    // without a secret unless one is configured — same policy as news/sync.
    if (isProd || secret) {
        if (!secret || provided !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
    }

    // force: the cron always attempts a rotation regardless of the renewal window.
    const result = await refreshInstagramToken({ force: true });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

// Allow either verb — most schedulers fire a simple GET.
export const GET = handler;
export const POST = handler;
