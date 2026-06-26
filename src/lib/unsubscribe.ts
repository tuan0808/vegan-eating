// src/lib/unsubscribe.ts
// Signed one-click unsubscribe links — no token table needed; the signature is
// derived from the email, so the link is self-validating.
import { createHmac, timingSafeEqual } from "crypto";
import { BASE } from "./email";

const SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "vegan-eating-unsub";

export function unsubToken(email: string): string {
    return createHmac("sha256", SECRET).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsubToken(email: string, token: string): boolean {
    const expected = unsubToken(email);
    if (token.length !== expected.length) return false;
    try {
        return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch {
        return false;
    }
}

export function unsubscribeUrl(email: string): string {
    const e = email.trim().toLowerCase();
    return `${BASE}/api/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubToken(e)}`;
}
