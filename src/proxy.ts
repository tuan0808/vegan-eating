// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

const BYPASS_COOKIE = "mb";

export function proxy(req: NextRequest) {
    const { pathname, searchParams } = req.nextUrl;

    // One-time preview: hit any URL with ?bypass=TOKEN to set a cookie and browse
    // the live site while maintenance is on.
    const token = process.env.MAINTENANCE_BYPASS_TOKEN;
    if (token && searchParams.get("bypass") === token) {
        const url = req.nextUrl.clone();
        url.searchParams.delete("bypass");
        const res = NextResponse.redirect(url);
        res.cookies.set(BYPASS_COOKIE, token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24,
        });
        return res;
    }

    // Expose the path to server components so the gate can exempt /admin and /api.
    const headers = new Headers(req.headers);
    headers.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers } });
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};