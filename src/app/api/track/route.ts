// src/app/api/track/route.ts
//
// Receives the client pageview beacon (see components/analytics/PageTracker)
// and writes one PageView row. Deliberately cheap and fire-and-forget: returns
// 204 fast, swallows errors so a tracking blip never surfaces to the reader.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifySource, classifyPath, isBot, visitorHash } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// First IP in x-forwarded-for, else the proxy's single-IP headers.
function clientIp(headers: Headers): string {
    const xff = headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]!.trim();
    return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "0.0.0.0";
}

export async function POST(req: Request) {
    try {
        const ua = req.headers.get("user-agent") || "";
        if (isBot(ua)) return new NextResponse(null, { status: 204 });

        const body = (await req.json().catch(() => ({}))) as { path?: unknown; ref?: unknown };
        const rawPath = typeof body.path === "string" ? body.path : "";
        if (!rawPath.startsWith("/")) return new NextResponse(null, { status: 204 });

        // Pathname only — drop query/hash so we never store search terms (PII).
        const path = rawPath.split(/[?#]/)[0]!.slice(0, 512);
        const referrer = typeof body.ref === "string" && body.ref ? body.ref.slice(0, 1024) : null;

        const selfHost = (req.headers.get("host") || "").split(":")[0]!;
        const source = classifySource(referrer, selfHost);
        const { kind, slug } = classifyPath(path);

        const day = new Date().toISOString().slice(0, 10);
        const visitor = visitorHash(clientIp(req.headers), ua, day);
        const country =
            req.headers.get("x-vercel-ip-country") ||
            req.headers.get("cf-ipcountry") ||
            req.headers.get("x-country") ||
            null;

        await prisma.pageView.create({
            data: { path, kind, slug, referrer, source, visitor, country },
        });
        return new NextResponse(null, { status: 204 });
    } catch {
        // Never let analytics break a page. Drop the event silently.
        return new NextResponse(null, { status: 204 });
    }
}
