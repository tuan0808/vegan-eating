// src/app/(app)/settings/PasswordSection.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, type PwResult } from "./actions";

const initial: PwResult = { ok: false };

function SendButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="cm-btn" disabled={pending}>
            {pending ? "Sending…" : "Email me a reset link"}
        </button>
    );
}

export default function PasswordSection() {
    const [state, formAction] = useActionState(requestPasswordReset, initial);

    if (state.ok) {
        return (
            <p className="cm-ok">
                Check your inbox — we sent a secure link to reset your password. It expires in 1
                hour.
            </p>
        );
    }

    return (
        <form action={formAction} className="cm-form">
            <p className="hint">
                For your security, changing your password requires confirming your email. We&apos;ll
                send a one-time link; open it to choose a new password.
            </p>
            {state.error && <p className="cm-err">{state.error}</p>}
            <SendButton />
        </form>
    );
}
