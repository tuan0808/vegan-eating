// src/lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// EMAIL_FROM needs a Resend-verified domain in production. Until you verify one,
// 'onboarding@resend.dev' works but only delivers to your own Resend account email.
const FROM = process.env.EMAIL_FROM ?? 'vegan eating <onboarding@resend.dev>'
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function sendVerificationEmail(to: string, token: string) {
    const url = `${BASE}/verify?token=${encodeURIComponent(token)}`

    return resend.emails.send({
        from: FROM,
        to,
        subject: 'Confirm your email — vegan eating',
        html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#2a2a24">
        <h1 style="font-size:22px;margin:0 0 12px">Welcome to vegan eating 🌱</h1>
        <p style="line-height:1.55">Confirm your email to start commenting and posting in the community.</p>
        <p style="margin:26px 0">
          <a href="${url}" style="background:#5b6b3f;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600;display:inline-block">Confirm email</a>
        </p>
        <p style="color:#7a7a70;font-size:13px;line-height:1.5">Or paste this link into your browser:<br>${url}</p>
        <p style="color:#7a7a70;font-size:13px">This link expires in 24 hours.</p>
      </div>
    `,
    })
}