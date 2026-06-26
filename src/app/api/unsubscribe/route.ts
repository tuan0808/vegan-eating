// src/app/api/unsubscribe/route.ts
// One endpoint for both the visible footer link (GET → confirmation page) and
// the RFC 8058 one-click List-Unsubscribe-Post header (POST → 200).
import type { NextRequest } from "next/server";
import { verifyUnsubToken } from "@/lib/unsubscribe";
import { addSuppressed } from "@/lib/newsletter-settings";

export const dynamic = "force-dynamic";

async function unsubscribe(req: NextRequest): Promise<boolean> {
    const url = new URL(req.url);
    const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
    const token = url.searchParams.get("t") ?? "";
    if (!email || !token || !verifyUnsubToken(email, token)) return false;
    await addSuppressed(email);
    return true;
}

function page(ok: boolean): Response {
    const body = ok
        ? `<h1 style="color:#225f27;margin:0 0 8px">You're unsubscribed</h1>
           <p>You won't receive any more newsletters from vegan eating. You can still use your account normally.</p>`
        : `<h1 style="color:#b4452a;margin:0 0 8px">Link expired or invalid</h1>
           <p>We couldn't process that unsubscribe link. Please use the link from your most recent email.</p>`;
    const html = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex">
      <title>Unsubscribe — vegan eating</title>
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:64px auto;padding:0 20px;color:#2a2a24;text-align:center">
        ${body}
        <p style="margin-top:22px"><a href="https://veganeating.com" style="color:#2f7d38;font-weight:600;text-decoration:none">Back to veganeating.com →</a></p>
      </div>`;
    return new Response(html, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(req: NextRequest): Promise<Response> {
    return page(await unsubscribe(req));
}

// RFC 8058 one-click: mail clients POST here. Return 200 regardless of body.
export async function POST(req: NextRequest): Promise<Response> {
    await unsubscribe(req);
    return new Response(null, { status: 200 });
}
