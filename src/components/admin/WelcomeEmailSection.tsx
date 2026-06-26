"use client";
// src/components/admin/WelcomeEmailSection.tsx
import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { saveWelcomeConfigAction, sendTestWelcomeAction, type State } from "@/lib/actions/newsletter-admin";

const initial: State = { ok: false, message: null };

function SaveButton() {
    const { pending } = useFormStatus();
    return <button type="submit" className="ns-btn" disabled={pending}>{pending ? "Saving…" : "Save"}</button>;
}

export default function WelcomeEmailSection({ enabled, testMode }: { enabled: boolean; testMode: boolean }) {
    const [state, action] = useActionState(saveWelcomeConfigAction, initial);
    const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
    const [pending, start] = useTransition();

    const sendTest = () => {
        setTest(null);
        start(async () => {
            const r = await sendTestWelcomeAction();
            setTest({ ok: r.ok, text: r.message ?? "" });
        });
    };

    return (
        <form action={action} className="ns-block">
            <label className="ns-check">
                <input type="checkbox" name="enabled" defaultChecked={enabled} />
                <span>Send a warm welcome email when a member verifies their email</span>
            </label>
            <label className="ns-check">
                <input type="checkbox" name="testMode" defaultChecked={testMode} />
                <span><b>Test mode</b> — route the welcome to the admin only, so real members aren&rsquo;t emailed until you&rsquo;ve approved how it looks. Turn this off to go live.</span>
            </label>

            <div className="ns-actions">
                <SaveButton />
                <button type="button" className="ns-btn ns-btn-ghost" onClick={sendTest} disabled={pending}>
                    {pending ? "Sending…" : "Send test welcome to me"}
                </button>
                {state.message ? <span className={`ns-flash ${state.ok ? "ok" : "err"}`}>{state.message}</span> : null}
                {test ? <span className={`ns-flash ${test.ok ? "ok" : "err"}`}>{test.text}</span> : null}
            </div>
        </form>
    );
}
