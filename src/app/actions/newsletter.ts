// src/app/actions/newsletter.ts
'use server'

export type NewsletterState = { ok: boolean; error: string | null }

// Adds an email to the configured Resend audience. Uses the REST API directly
// (no SDK dependency). Duplicates are treated as success — re-subscribing is fine.
async function addContact(rawEmail: string): Promise<NewsletterState> {
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

        return { ok: true, error: null }
    } catch {
        return { ok: false, error: 'Could not subscribe right now. Please try again.' }
    }
}

// For the band form (useFormState).
export async function subscribeNewsletter(
    _prev: NewsletterState,
    formData: FormData,
): Promise<NewsletterState> {
    return addContact(String(formData.get('email') ?? ''))
}

// For a direct call from a client handler (the header modal).
export async function subscribeEmail(email: string): Promise<NewsletterState> {
    return addContact(email)
}