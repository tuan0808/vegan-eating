// src/app/(site)/verify/page.tsx
import Link from 'next/link'
import { consumeVerificationToken, type VerifyResult } from '@/lib/verification'

export const dynamic = "force-dynamic";
const COPY: Record<VerifyResult, { title: string; body: string }> = {
    ok: {
        title: 'Email confirmed',
        body: 'Your account is verified — you can comment and post in the community now.',
    },
    expired: {
        title: 'Link expired',
        body: 'That verification link has expired. Sign in and request a new one.',
    },
    invalid: {
        title: 'Invalid link',
        body: 'We couldn’t verify this link. It may have already been used.',
    },
}

export default async function VerifyPage({
                                             searchParams,
                                         }: {
    searchParams?: { token?: string }
}) {
    const token = searchParams?.token
    const result: VerifyResult = token ? await consumeVerificationToken(token) : 'invalid'
    const copy = COPY[result]

    return (
        <div style={{ maxWidth: 460, margin: '4rem auto', padding: '0 1.5rem' }}>
            <h1
                style={{
                    fontFamily: 'var(--display, "Fraunces", Georgia, serif)',
                    fontSize: '2rem',
                    color: 'var(--ink)',
                    margin: '0 0 0.5rem',
                }}
            >
                {copy.title}
            </h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{copy.body}</p>
            <p style={{ marginTop: '1.75rem' }}>
                <Link href="/login" style={{ color: 'var(--green)', fontWeight: 600, textDecoration: 'none' }}>
                    Go to sign in →
                </Link>
            </p>
        </div>
    )
}