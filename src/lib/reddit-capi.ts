// src/lib/reddit-capi.ts
//
// Server-side Reddit Conversions API (CAPI). Mirrors the browser pixel for the
// high-value conversions (SignUp, Lead) so events still land when the pixel is
// blocked by an ad-blocker or a redirect eats the client-side fire.
//
// Dedup: every server event carries the SAME conversion_id as its pixel twin,
// and Reddit de-duplicates on (event_type + conversion_id). So double-firing is
// intentional and safe — Reddit keeps whichever arrives first.
//
// Fully env-guarded: with no token configured every call is a cheap no-op, and
// nothing here ever throws into the caller (a marketing beacon must never break
// a signup or a newsletter opt-in).
//
// Env:
//   REDDIT_CONVERSION_ACCESS_TOKEN  – secret bearer token (Reddit Ads → Events Manager)
//   REDDIT_CAPI_ACCOUNT_ID          – optional; defaults to NEXT_PUBLIC_REDDIT_PIXEL_ID
//   REDDIT_CAPI_TEST_MODE           – "1"/"true" to route events to Reddit's test view
import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { REDDIT_PIXEL_ID, type RedditEventName } from "@/lib/reddit-config";

const ENDPOINT = "https://ads-api.reddit.com/api/v2.0/conversions/events";

const ACCESS_TOKEN = process.env.REDDIT_CONVERSION_ACCESS_TOKEN || "";
const ACCOUNT_ID = process.env.REDDIT_CAPI_ACCOUNT_ID || REDDIT_PIXEL_ID;
const TEST_MODE = /^(1|true|yes)$/i.test(process.env.REDDIT_CAPI_TEST_MODE || "");

/** CAPI is live only when both a token and an account id are configured. */
export function redditCapiEnabled(): boolean {
    return ACCESS_TOKEN.length > 0 && ACCOUNT_ID.length > 0;
}

// Reddit requires PII match keys as lowercase-hex SHA-256. Email is normalised
// (trim + lowercase) first; user_agent and the _rdt_uuid cookie are sent raw.
function sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
}
function hashEmail(email: string): string | undefined {
    const e = email.trim().toLowerCase();
    return e ? sha256(e) : undefined;
}

export type RedditCapiInput = {
    eventName: RedditEventName;
    /** Shared with the browser pixel so Reddit de-dupes the pair. */
    conversionId: string;
    /** Raw email — hashed here, never sent or logged in the clear. */
    email?: string | null;
    /** App user id, if known — hashed into external_id for logged-in matching. */
    externalId?: string | null;
    /** Client IP (first x-forwarded-for hop) — hashed. */
    ipAddress?: string | null;
    userAgent?: string | null;
    /** rdt_cid click id captured from the ad landing URL. */
    clickId?: string | null;
    /** _rdt_uuid first-party cookie the pixel drops — sent raw for matching. */
    uuid?: string | null;
    /** For Custom events. */
    customEventName?: string;
    /** ISO timestamp; defaults to now. */
    eventAt?: string;
};

/** IP + UA + Reddit cookies for the current request — the match keys a server
 *  action can pull without threading the request through every layer. Reads
 *  next/headers, so only call it inside a request scope (server action / route).
 *  The pixel drops `_rdt_uuid`; RedditPixel.tsx mirrors the ad click id into an
 *  `rdt_cid` cookie so it survives the POST→redirect a signup/opt-in performs. */
export async function redditMatchFromRequest(): Promise<{
    ipAddress: string | null;
    userAgent: string | null;
    uuid: string | null;
    clickId: string | null;
}> {
    const h = await headers();
    const c = await cookies();
    const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        h.get("x-real-ip") ||
        h.get("cf-connecting-ip") ||
        null;
    return {
        ipAddress: ip,
        userAgent: h.get("user-agent"),
        uuid: c.get("_rdt_uuid")?.value ?? null,
        clickId: c.get("rdt_cid")?.value ?? null,
    };
}

/**
 * Fire-and-forget a single conversion to Reddit. Resolves to whether the event
 * was accepted; never rejects. Safe to `void` at a call site — do NOT block a
 * user response on the network round-trip.
 */
export async function sendRedditEvent(input: RedditCapiInput): Promise<boolean> {
    if (!redditCapiEnabled()) return false;

    const user: Record<string, unknown> = {};
    const emailHash = input.email ? hashEmail(input.email) : undefined;
    if (emailHash) user.email = emailHash;
    if (input.externalId) user.external_id = sha256(input.externalId);
    if (input.ipAddress) user.ip_address = sha256(input.ipAddress);
    if (input.userAgent) user.user_agent = input.userAgent;
    if (input.uuid) user.uuid = input.uuid;

    const event: Record<string, unknown> = {
        event_at: input.eventAt || new Date().toISOString(),
        event_type: {
            tracking_type: input.eventName,
            ...(input.eventName === "Custom" && input.customEventName
                ? { custom_event_name: input.customEventName }
                : {}),
        },
        event_metadata: { conversion_id: input.conversionId },
        user,
        ...(input.clickId ? { click_id: input.clickId } : {}),
    };

    try {
        const res = await fetch(`${ENDPOINT}/${ACCOUNT_ID}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ events: [event], test_mode: TEST_MODE }),
            cache: "no-store",
        });
        if (!res.ok) {
            // Swallow the body but surface status for debugging in server logs.
            console.error(`Reddit CAPI ${input.eventName} failed: ${res.status}`);
            return false;
        }
        return true;
    } catch (e) {
        console.error("Reddit CAPI request error:", e);
        return false;
    }
}
