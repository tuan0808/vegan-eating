// src/lib/email.ts
import { Resend } from 'resend'
import { getWelcomeEmail } from './newsletter-settings'

const resend = new Resend(process.env.RESEND_API_KEY)

// FROM must be an address on a Resend-verified domain. veganeating.com is verified,
// so noreply@veganeating.com is valid even though no inbox sits behind it.
const FROM = process.env.EMAIL_FROM ?? 'vegan eating <noreply@veganeating.com>'

// This file is server-only, so prefer a runtime var (SITE_URL) — it's picked up on a
// plain restart/redeploy. NEXT_PUBLIC_SITE_URL is inlined at BUILD time, so it's kept
// only as a fallback. Trailing slash stripped so we never emit "//verify".
export const BASE = (
    process.env.SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://veganeating.com'
).replace(/\/+$/, '')

// --- Welcome email (fires once, on email verification) ----------------------
// Content is admin-editable (Setting), with {{name}} replaced per recipient.
export async function sendWelcomeEmail(
    to: string,
    name?: string | null,
    override?: { subject?: string; html?: string },
) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not set at runtime — cannot send welcome email.')
    }
    const stored = await getWelcomeEmail()
    const subject = (override?.subject ?? '').trim() || stored.subject
    const rawHtml = (override?.html ?? '') || stored.html
    const safeName = (name ?? '').trim() || 'there'
    const finalHtml = rawHtml.replace(/\{\{\s*name\s*\}\}/g, safeName)

    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html: finalHtml })
    if (error) {
        throw new Error(`Resend rejected the welcome email: ${error.name ?? 'error'} — ${error.message ?? JSON.stringify(error)}`)
    }
    return data
}

// --- Newsletter (admin broadcast) -------------------------------------------
function newsletterFooter(unsubscribeUrl: string): string {
    return `<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:26px auto 0;padding:14px 8px 0;border-top:1px solid #e4e2d6;color:#9a9789;font-size:12px;line-height:1.5;text-align:center">
      You're receiving this because you have an account or subscribed at veganeating.com.<br>
      <a href="${unsubscribeUrl}" style="color:#9a9789;text-decoration:underline">Unsubscribe</a> &nbsp;·&nbsp; vegan eating
    </div>`
}

function newsletterPayload(to: string, subject: string, html: string, unsubscribeUrl: string) {
    return {
        from: FROM,
        to,
        subject,
        html: html + newsletterFooter(unsubscribeUrl),
        headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
    }
}

/** Send one newsletter email (used for the admin "send test"). */
export async function sendNewsletterEmail(to: string, subject: string, html: string, unsubscribeUrl: string) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not set at runtime — cannot send newsletter.')
    }
    const { data, error } = await resend.emails.send(newsletterPayload(to, subject, html, unsubscribeUrl))
    if (error) {
        throw new Error(`Resend rejected the newsletter email: ${error.name ?? 'error'} — ${error.message ?? JSON.stringify(error)}`)
    }
    return data
}

/** Batch-send the newsletter (Resend caps batches at 100). Each recipient gets
 *  their own unsubscribe link. Returns the number sent. */
export async function sendNewsletterBatch(
    items: { to: string; unsubscribeUrl: string }[],
    subject: string,
    html: string,
): Promise<number> {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not set at runtime — cannot send newsletter.')
    }
    let sent = 0
    for (let i = 0; i < items.length; i += 100) {
        const chunk = items.slice(i, i + 100).map((it) => newsletterPayload(it.to, subject, html, it.unsubscribeUrl))
        const { error } = await resend.batch.send(chunk)
        if (error) {
            throw new Error(`Resend batch send failed: ${error.name ?? 'error'} — ${error.message ?? JSON.stringify(error)}`)
        }
        sent += chunk.length
    }
    return sent
}

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

export async function sendPasswordResetEmail(to: string, token: string) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error(
            'RESEND_API_KEY is not set at runtime — cannot send password reset email.'
        )
    }

    const url = `${BASE}/settings/reset-password?token=${encodeURIComponent(token)}`

    const { data, error } = await resend.emails.send({
        from: FROM,
        to,
        subject: 'Reset your password — vegan eating',
        html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#2a2a24">
        <h1 style="font-size:22px;margin:0 0 12px">Reset your password</h1>
        <p style="line-height:1.55">We got a request to change the password on your vegan eating account. Click below to choose a new one.</p>
        <p style="margin:26px 0">
          <a href="${url}" style="background:#5b6b3f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block">Reset password</a>
        </p>
        <p style="color:#7a7a70;font-size:13px;line-height:1.5">Or paste this link into your browser:<br>${url}</p>
        <p style="color:#7a7a70;font-size:13px">This link expires in 1 hour. If you didn't ask for this, you can safely ignore this email — your password won't change.</p>
      </div>
    `,
    })

    if (error) {
        throw new Error(
            `Resend rejected the password reset email: ${error.name ?? 'error'} — ${
                error.message ?? JSON.stringify(error)
            }`
        )
    }

    return data
}