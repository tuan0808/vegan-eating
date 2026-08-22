// src/components/BandNewsletter.tsx
"use client";

import { useActionState, useEffect, useMemo, useRef } from "react";
import { useFormStatus } from "react-dom";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { rdtTrack, newConversionId } from "@/components/analytics/reddit-pixel";

const initial: NewsletterState = { ok: false, error: null };

// Text is admin-editable (Site settings → Newsletter videos); the defaults here
// mirror the original hardcoded copy for when nothing is configured yet.
const DEFAULT_PLACEHOLDER = "Just want the newsletter? Drop your email";
const DEFAULT_BUTTON = "Sign up";
const DEFAULT_SUCCESS = "Thanks — you're on the list. A tested recipe lands each Sunday.";

function SignUpButton({ label }: { label: string }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending}>
            {pending ? "Signing up…" : label}
        </button>
    );
}

export default function BandNewsletter({
    placeholder = DEFAULT_PLACEHOLDER,
    button = DEFAULT_BUTTON,
    success = DEFAULT_SUCCESS,
}: {
    placeholder?: string;
    button?: string;
    success?: string;
}) {
    const [state, formAction] = useActionState(subscribeNewsletter, initial);
    // One id per mount, shared between this pixel Lead and the CAPI Lead the
    // server action fires (via the hidden field) so Reddit dedupes them.
    const conversionId = useMemo(() => newConversionId(), []);
    // Mount time — the action rejects submits faster than a human could type.
    const mountedAt = useMemo(() => Date.now(), []);
    const fired = useRef(false);

    // Fire the pixel Lead once, when the server action reports success.
    useEffect(() => {
        if (state.ok && !fired.current) {
            fired.current = true;
            rdtTrack("Lead", { conversionId });
        }
    }, [state.ok, conversionId]);

    if (state.ok) {
        return (
            <p style={{ color: "var(--paper)", fontWeight: 600, margin: "4px 0 0" }}>
                {success}
            </p>
        );
    }

    return (
        <>
            <form className="news-form" action={formAction}>
                <input type="hidden" name="conversionId" value={conversionId} />
                <input type="hidden" name="ts" value={mountedAt} />
                {/* Honeypot — hidden from people, tempting to bots. Leave empty. */}
                <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
                />
                <input
                    type="email"
                    name="email"
                    placeholder={placeholder}
                    aria-label="Email"
                    required
                />
                <SignUpButton label={button} />
            </form>
            {state.error && (
                <p style={{ color: "#ffd9c2", margin: "8px 0 0", fontSize: 14 }}>{state.error}</p>
            )}
        </>
    );
}