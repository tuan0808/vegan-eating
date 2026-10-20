// src/app/(app)/settings/newsletter-form.tsx
"use client";

import { useState, useTransition } from "react";
import { setNewsletterOptIn } from "./actions";

export default function NewsletterForm({ subscribed: initial }: { subscribed: boolean }) {
    const [subscribed, setSubscribed] = useState(initial);
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState(false);
    const [pending, start] = useTransition();

    const toggle = (next: boolean) => {
        setSubscribed(next);
        setMsg(null);
        start(async () => {
            const res = await setNewsletterOptIn(next);
            if (res.ok) {
                setErr(false);
                setMsg(next ? "You're subscribed to the newsletter." : "You've been unsubscribed. You can rejoin anytime.");
            } else {
                setSubscribed(!next);
                setErr(true);
                setMsg("Couldn't save that. Please try again.");
            }
        });
    };

    return (
        <div className="cm-form">
            <label className="cm-check">
                <input
                    type="checkbox"
                    checked={subscribed}
                    disabled={pending}
                    onChange={(e) => toggle(e.target.checked)}
                />
                <span>
                    Email me the vegan eating newsletter — one tested recipe each Sunday. Uncheck to opt out.
                </span>
            </label>
            {msg && <p className={err ? "cm-err" : "cm-ok"}>{msg}</p>}
        </div>
    );
}
