// src/lib/turnstile.ts
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Server-side validation of a Cloudflare Turnstile token.
 * If TURNSTILE_SECRET_KEY isn't set (e.g. local dev before you configure it),
 * this returns true so signup still works — Turnstile is effectively off until
 * you add the key. Set it in production.
 */
export async function verifyTurnstile(token: string | null, ip?: string | null): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY
    if (!secret) return true // not configured — don't block
    if (!token) return false

    try {
        const body = new URLSearchParams({ secret, response: token })
        if (ip) body.set('remoteip', ip)

        const res = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        })
        const data = (await res.json()) as { success?: boolean }
        return data.success === true
    } catch {
        return false
    }
}