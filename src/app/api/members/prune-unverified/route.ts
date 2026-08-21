// src/app/api/members/prune-unverified/route.ts
//
// Deletes accounts that never verified their email within the grace window (see
// pruneUnverifiedMembers). CRON_SECRET-guarded, same policy as the other cron
// routes — a daily GitHub Action points here. Safe to hit by hand near a cleanup.
import { NextResponse } from "next/server";
import { pruneUnverifiedMembers } from "@/lib/prune-unverified";

export const dynamic = "force-dynamic";

async function handler(req: Request) {
    const secret = process.env.CRON_SECRET;
    const provided = req.headers.get("authorization");
    const isProd = process.env.NODE_ENV === "production";

    // Production: a secret is mandatory and must match. Dev: allowed without one
    // unless configured — mirrors /api/instagram/refresh.
    if (isProd || secret) {
        if (!secret || provided !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "unauthorized" }, { status: 401 });
        }
    }

    const result = await pruneUnverifiedMembers();
    return NextResponse.json(result, { status: 200 });
}

export const GET = handler;
export const POST = handler;
