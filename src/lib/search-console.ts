// src/lib/search-console.ts
//
// Google Search Console — the only source of true SEO signal (the actual
// queries you rank for, impressions, clicks, average position). First-party
// pageview analytics can't show these. Dependency-free: we mint a service-
// account JWT with Node crypto, exchange it for an access token, then call the
// Search Analytics API over REST.
//
// Dormant until these env vars are set (see .env.example):
//   GSC_SITE_URL      e.g. "sc-domain:veganeating.com" or "https://veganeating.com/"
//   GSC_CLIENT_EMAIL  the service account's email
//   GSC_PRIVATE_KEY   its private key (PEM; literal "\n" newlines are unescaped)
//
// Setup (one-time, on your side):
//   1. Verify the site in Google Search Console.
//   2. Google Cloud → create a service account, enable "Google Search Console API".
//   3. In Search Console → Settings → Users, add the service-account email (Full/Restricted).
//   4. Put the three env vars above in place and redeploy.
import { createSign } from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type GscRow = { query: string; clicks: number; impressions: number; ctr: number; position: number };
export type GscResult =
    | { configured: false }
    | { configured: true; ok: false; error: string }
    | { configured: true; ok: true; rows: GscRow[]; totals: { clicks: number; impressions: number } };

export function isGscConfigured(): boolean {
    return Boolean(process.env.GSC_SITE_URL && process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY);
}

function base64url(input: Buffer | string): string {
    return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Mint + exchange a service-account JWT for a short-lived access token.
async function getAccessToken(): Promise<string> {
    const email = process.env.GSC_CLIENT_EMAIL!;
    const key = process.env.GSC_PRIVATE_KEY!.replace(/\\n/g, "\n");
    const now = Math.floor(Date.now() / 1000);

    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claim = base64url(
        JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
    );
    const signature = base64url(createSign("RSA-SHA256").update(`${header}.${claim}`).sign(key));
    const assertion = `${header}.${claim}.${signature}`;

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`token exchange failed (HTTP ${res.status})`);
    const json = (await res.json()) as { access_token?: string };
    if (!json.access_token) throw new Error("token exchange returned no access_token");
    return json.access_token;
}

function ymd(daysAgo: number): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return d.toISOString().slice(0, 10);
}

// Top search queries for the last `days`. Cached for an hour — the GSC API is
// rate-limited and the data only updates daily anyway.
export async function getSearchQueries(days = 28, rowLimit = 25): Promise<GscResult> {
    if (!isGscConfigured()) return { configured: false };
    try {
        const token = await getAccessToken();
        const site = encodeURIComponent(process.env.GSC_SITE_URL!);
        const res = await fetch(
            `https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
            {
                method: "POST",
                headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
                body: JSON.stringify({
                    startDate: ymd(days),
                    endDate: ymd(1), // GSC data lags ~2 days; yesterday is the latest reliable day
                    dimensions: ["query"],
                    rowLimit,
                }),
                next: { revalidate: 3600 },
            },
        );
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            return { configured: true, ok: false, error: `Search Console API HTTP ${res.status}. ${detail.slice(0, 200)}` };
        }
        const json = (await res.json()) as {
            rows?: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[];
        };
        const rows: GscRow[] = (json.rows ?? []).map((r) => ({
            query: r.keys[0] ?? "",
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position,
        }));
        const totals = rows.reduce(
            (acc, r) => ({ clicks: acc.clicks + r.clicks, impressions: acc.impressions + r.impressions }),
            { clicks: 0, impressions: 0 },
        );
        return { configured: true, ok: true, rows, totals };
    } catch (err) {
        return { configured: true, ok: false, error: err instanceof Error ? err.message : "unknown error" };
    }
}
