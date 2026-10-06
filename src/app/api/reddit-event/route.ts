// src/app/api/reddit-event/route.ts
//
// First-party relay for the browser-side Reddit events (PageVisit, ViewContent,
// Search). The pixel fires in the browser; reddit-pixel.ts beacons the same
// event + conversion_id here and we forward it to the Conversions API, so
// Reddit sees a server twin for every pixel event (and still gets the event
// when an ad-blocker eats pixel.js — this endpoint is on our own origin).
//
// SignUp / Lead are NOT accepted here: those are sent server-side from the
// register / newsletter actions, where we have the email to hash.
import { NextResponse } from "next/server";
import { isBot } from "@/lib/analytics";
import { redditCapiEnabled, redditMatchFromRequest, sendRedditEvent } from "@/lib/reddit-capi";
import type { RedditEventName } from "@/lib/reddit-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RELAYED: ReadonlySet<RedditEventName> = new Set(["PageVisit", "ViewContent", "Search"]);

export async function POST(req: Request) {
    try {
        if (!redditCapiEnabled()) return new NextResponse(null, { status: 204 });
        const ua = req.headers.get("user-agent") || "";
        if (isBot(ua)) return new NextResponse(null, { status: 204 });

        // Same-origin only — keeps third parties from pumping events into the ad account.
        const site = req.headers.get("sec-fetch-site");
        if (site && site !== "same-origin") return new NextResponse(null, { status: 204 });

        const body = (await req.json().catch(() => ({}))) as { event?: unknown; conversionId?: unknown };
        const event = body.event as RedditEventName;
        const conversionId = typeof body.conversionId === "string" ? body.conversionId.slice(0, 100) : "";
        if (!RELAYED.has(event) || !conversionId) return new NextResponse(null, { status: 204 });

        const match = await redditMatchFromRequest();
        await sendRedditEvent({ eventName: event, conversionId, ...match });
        return new NextResponse(null, { status: 204 });
    } catch {
        // A marketing beacon must never surface an error to the reader.
        return new NextResponse(null, { status: 204 });
    }
}
