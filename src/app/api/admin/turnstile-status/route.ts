// src/app/api/admin/turnstile-status/route.ts
//
// Admin-only runtime diagnostic for Turnstile config. Reports whether the
// SERVER process actually sees the two env vars — the definitive way to tell a
// "set in DO but wrong scope/name" secret from a working one. Never returns the
// secret value: only presence + length, so it's safe to hit from a browser.
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
    const secret = process.env.TURNSTILE_SECRET_KEY ?? "";
    return NextResponse.json({
        // Site key is public, so a short preview is fine and helps confirm identity.
        hasSiteKey: siteKey.length > 0,
        siteKeyPreview: siteKey ? `${siteKey.slice(0, 10)}…` : null,
        // Secret: presence + length ONLY. If hasSecret is false here, the running
        // server isn't seeing it → check the DO var's scope/name (see PR notes).
        hasSecret: secret.length > 0,
        secretLength: secret.length,
        // When both are true, verifyTurnstile() will actually call siteverify.
        enforcing: siteKey.length > 0 && secret.length > 0,
    });
}
