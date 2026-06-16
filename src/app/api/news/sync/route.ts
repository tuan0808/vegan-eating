// src/app/api/news/sync/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncNews } from "@/lib/news-sync";

export const dynamic = "force-dynamic"; // never cache the sync endpoint

async function handler(req: Request) {
    const secret = process.env.CRON_SECRET;
    const provided = req.headers.get("authorization");
    const isProd = process.env.NODE_ENV === "production";

    // Production: a secret is mandatory and must match — this endpoint spends paid
    // newsdata credits, so it must never be open to the public.
    // Development: if no secret is set, allow the call so you can test locally;
    // if you have set one, it's still enforced.
    if (isProd || secret) {
        if (!secret || provided !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
    }

    try {
        const result = await syncNews();
        // Refresh the cached pages so new stories show up immediately, not on the next hourly turn.
        revalidatePath("/news");
        revalidatePath("/news/[slug]", "page");
        return NextResponse.json({ ok: true, ...result });
    } catch (err) {
        console.error("[news sync]", err);
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}

// Allow either verb — most schedulers fire a simple GET.
export const GET = handler;
export const POST = handler;