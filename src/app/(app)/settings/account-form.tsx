// src/app/(app)/settings/account-form.tsx
"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateAccount, type AccountResult } from "@/lib/actions/community";

const initial: AccountResult = { ok: false };

function SaveButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="cm-btn" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
        </button>
    );
}

export default function AccountForm({ defaultEmail }: { defaultEmail: string }) {
    const [state, formAction] = useFormState(updateAccount, initial);

    return (
        <form action={formAction} className="cm-form">
            <div className="cm-field">
                <label htmlFor="email">Email address</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    className="cm-input"
                    defaultValue={defaultEmail}
                    required
                />
                <span className="hint">Changing your email will require re-verification.</span>
            </div>

            {state.ok && <p className="cm-ok">Saved.</p>}
            {state.error && <p className="cm-err">{state.error}</p>}

            <SaveButton />
        </form>
    );
}