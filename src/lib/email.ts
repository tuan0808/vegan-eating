// src/lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// FROM must be an address on a Resend-verified domain. veganeating.com is verified,
// so noreply@veganeating.com is valid even though no inbox sits behind it.
const FROM = process.env.EMAIL_FROM ?? 'vegan eating <noreply@veganeating.com>'

// This file is server-only, so prefer a runtime var (SITE_URL) — it's picked up on a
// plain restart/redeploy. NEXT_PUBLIC_SITE_URL is inlined at BUILD time, so it's kept
// only as a fallback. Trailing slash stripped so we never emit "//verify".
const BASE = (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://veganeating.com'
).replace(/\/+$/, '')

export async function sendVerificationEmail(to: string, token: string) {
    // Fail loud if the key never made it to runtime (e.g. build-time-only env scope).
    if (!process.env.RESEND_API_KEY) {
        throw new Error(
            'RESEND_API_KEY is not set at runtime — cannot send verification email.'
        )
    }

    const url = `${BASE}/verify?token=${encodeURIComponent(token)}`

    const { data, error } = await resend.emails.send({
        from: FROM,
        to,
        subject: 'Confirm your email — vegan eating',
        html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#2a2a24">
        <h1 style="font-size:22px;margin:0 0 12px">Welcome to vegan eating </h1>
        <p style="line-height:1.55">Confirm your email to start commenting and posting in the community.</p>
        <p style="margin:26px 0">
          <a href="${url}" style="background:#5b6b3f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block">Confirm email</a>
        </p>
        <p style="color:#7a7a70;font-size:13px;line-height:1.5">Or paste this link into your browser:<br>${url}</p>
        <p style="color:#7a7a70;font-size:13px">This link expires in 24 hours.</p>
      </div>
    `,
    })

    // Resend RESOLVES (does not throw) on API rejection — the failure lives in `error`.
    // Surface it so the caller's try/catch in actions.ts actually logs it.
    if (error) {
        throw new Error(
            `Resend rejected the verification email: ${error.name ?? 'error'} — ${
                error.message ?? JSON.stringify(error)
            }`
        )
    }

    return data
}