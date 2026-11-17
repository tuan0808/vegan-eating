// src/app/api/vendors/route.ts
//
// Powers the nav "Forum" dropdown's vendor list. Returns the PROMINENT vendors
// only; the promo code is included ONLY for logged-in members — logged-out
// callers get `code: null`, so the obfuscation holds even against view-source.
import { NextResponse } from "next/server";
import { getVendorConfig, publicVendors } from "@/lib/vendor-config";
import { currentUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic"; // always fresh; never cache member codes

export async function GET() {
    const [cfg, user] = await Promise.all([getVendorConfig(), currentUser()]);
    const loggedIn = !!user?.id;
    return NextResponse.json(
        { loggedIn, vendors: publicVendors(cfg, loggedIn), dealsHref: cfg.dealsHref },
        { headers: { "Cache-Control": "no-store" } },
    );
}
