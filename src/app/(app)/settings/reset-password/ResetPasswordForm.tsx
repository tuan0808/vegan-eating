// src/app/(app)/settings/reset-password/ResetPasswordForm.tsx
"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { resetPassword, type PwResult } from "../actions";

const initial: PwResult = { ok: false };

function SaveButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="cm-btn" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
        </button>
    );
}

export default function ResetPasswordForm({ token }: { token: string }) {
    const [state, formAction] = useFormState(resetPassword, initial);

    if (state.ok) {
        return (
            <p className="cm-ok">
                Your password has been updated.{" "}
                <Link href="/settings" style={{ color: "var(--accent,#5b6b3f)", fontWeight: 600 }}>
                    Back to settings
                </Link>
            </p>
        );
    }

    return (
        <form action={formAction} className="cm-form">
            <input type="hidden" name="token" value={token} />

            <div className="cm-field">
                <label htmlFor="password">New password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    className="cm-input"
                    minLength={8}
                    maxLength={100}
                    autoComplete="new-password"
                    required
                />
                <span className="hint">At least 8 characters.</span>
            </div>

            <div className="cm-field">
                <label htmlFor="confirm">Confirm new password</label>
                <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    className="cm-input"
                    minLength={8}
                    maxLength={100}
                    autoComplete="new-password"
                    required
                />
            </div>

            {state.error && <p className="cm-err">{state.error}</p>}

            <SaveButton />
        </form>
    );
}
