// src/app/actions/newsletter.ts
'use server'

import { randomUUID } from 'crypto'
import { sendRedditEvent, redditMatchFromRequest } from '@/lib/reddit-capi'

export type NewsletterState = { ok: boolean; error: string | null }

// Signals a real person can't trip but a dumb bot will: a hidden honeypot field
// (invisible to humans, so any value = bot) and a minimum fill time (forms
// submitted faster than a human could type an email are automated). Newsletter
// signup is low-harm, so on a hit we DON'T error — we pretend success so the bot
// learns nothing and moves on, while writing nothing.
const MIN_FILL_MS = 1500
type BotSignals = { website?: string | null; ts?: number | null }
function looksLikeBot({ website, ts }: BotSignals): boolean {
    if (website && website.trim() !== '') return true
    if (ts && ts > 0 && Date.now() - ts < MIN_FILL_MS) return true
    return false
}

// Fire the Reddit Lead conversion (server side / CAPI). conversionId is the same
// one the browser pixel uses, so Reddit de-dupes the pair. Best-effort: awaited
// so it flushes on serverless, self-guarded so it never affects the opt-in.
async function trackNewsletterLead(email: string, conversionId?: string): Promise<void> {
    const match = await redditMatchFromRequest()
    await sendRedditEvent({
        eventName: 'Lead',
        conversionId: conversionId || randomUUID(),
        email,
        ...match,
    })
}

// Adds an email to the configured Resend audience. Uses the REST API directly
// (no SDK dependency). Duplicates are treated as success — re-subscribing is fine.
async function addContact(rawEmail: string, conversionId?: string): Promise<NewsletterState> {
    const email = rawEmail.trim().toLowerCase()
    if (!/.+@.+\..+/.test(email)) return { ok: false, error: 'Enter a valid email address.' }

    const apiKey = process.env.RESEND_API_KEY
    const audienceId = process.env.RESEND_AUDIENCE_ID
    if (!apiKey || !audienceId) {
        return { ok: false, error: 'The newsletter isn’t configured yet.' }
    }

    try {
        const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, unsubscribed: false }),
            cache: 'no-store',
        })

        if (!res.ok) {
            const data = await res.json().catch(() => null)
            const msg = String(data?.message ?? '')
            // Already on the list → not an error from the visitor's point of view.
            if (res.status === 409 || /already|exists|duplicate/i.test(msg)) {
                return { ok: true, error: null }
            }
            return { ok: false, error: 'Could not subscribe right now. Please try again.' }
        }

        await trackNewsletterLead(email, conversionId)
        return { ok: true, error: null }
    } catch {
        return { ok: false, error: 'Could not subscribe right now. Please try again.' }
    }
}

// For the band form (useFormState). The client seeds a hidden `conversionId`
// field so its pixel Lead and this CAPI Lead share an id and get deduped.
export async function subscribeNewsletter(
    _prev: NewsletterState,
    formData: FormData,
): Promise<NewsletterState> {
    const tsRaw = Number(formData.get('ts'))
    if (looksLikeBot({ website: String(formData.get('website') ?? ''), ts: Number.isFinite(tsRaw) ? tsRaw : null })) {
        return { ok: true, error: null } // silently drop — behave like a normal success
    }
    const conversionId = String(formData.get('conversionId') ?? '') || undefined
    return addContact(String(formData.get('email') ?? ''), conversionId)
}

// For a direct call from a client handler (the header/footer modal). Bot signals
// are passed explicitly since the modal builds the request by hand, not from a
// <form>'s fields.
export async function subscribeEmail(
    email: string,
    conversionId?: string,
    bot?: BotSignals,
): Promise<NewsletterState> {
    if (bot && looksLikeBot(bot)) return { ok: true, error: null } // silently drop
    return addContact(email, conversionId)
}