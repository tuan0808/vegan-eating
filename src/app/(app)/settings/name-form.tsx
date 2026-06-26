// src/app/(app)/settings/name-form.tsx
"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateName, type NameResult } from "@/lib/actions/community";

const initial: NameResult = { ok: false };

function SaveButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="cm-btn" disabled={pending}>
            {pending ? "Saving…" : "Save name"}
        </button>
    );
}

export default function NameForm({ firstName, lastName }: { firstName: string; lastName: string }) {
    const [state, action] = useActionState(updateName, initial);

    return (
        <form action={action} className="cm-form">
            <p className="cm-note">
                Your name is free to change — no email re-verification — but only <strong>once every 6
                months</strong>, so pick something you'll keep.
            </p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div className="cm-field" style={{ flex: 1, minWidth: 160 }}>
                    <label htmlFor="firstName">First name</label>
                    <input id="firstName" name="firstName" className="cm-input" defaultValue={firstName} maxLength={40} />
                </div>
                <div className="cm-field" style={{ flex: 1, minWidth: 160 }}>
                    <label htmlFor="lastName">Last name</label>
                    <input id="lastName" name="lastName" className="cm-input" defaultValue={lastName} maxLength={40} />
                </div>
            </div>
            {state.ok && <p className="cm-ok">Name updated.</p>}
            {state.error && <p className="cm-err">{state.error}</p>}
            <SaveButton />
        </form>
    );
}
