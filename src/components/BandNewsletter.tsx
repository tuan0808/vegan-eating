// src/components/BandNewsletter.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";

const initial: NewsletterState = { ok: false, error: null };

function SignUpButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending}>
            {pending ? "Signing up…" : "Sign up"}
        </button>
    );
}

export default function BandNewsletter() {
    const [state, formAction] = useFormState(subscribeNewsletter, initial);

    if (state.ok) {
        return (
            <p style={{ color: "var(--paper)", fontWeight: 600, margin: "4px 0 0" }}>
                Thanks — you&apos;re on the list. A tested recipe lands each Sunday.
            </p>
        );
    }

    return (
        <>
            <form className="news-form" action={formAction}>
                <input
                    type="email"
                    name="email"
                    placeholder="Just want the newsletter? Drop your email"
                    aria-label="Email"
                    required
                />
                <SignUpButton />
            </form>
            {state.error && (
                <p style={{ color: "#ffd9c2", margin: "8px 0 0", fontSize: 14 }}>{state.error}</p>
            )}
        </>
    );
}