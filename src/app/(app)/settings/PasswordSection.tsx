// src/app/(app)/settings/PasswordSection.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { requestPasswordReset } from "./actions";
import { confirmCurrentEmail } from "@/lib/actions/community";

export default function PasswordSection() {
    const [email, setEmail] = useState("");
    const [matched, setMatched] = useState(false);
    const [checking, setChecking] = useState(false);
    const [sent, setSent] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [resendMsg, setResendMsg] = useState<string | null>(null);
    const [pending, start] = useTransition();

    useEffect(() => {
        const e = email.trim();
        if (!e) {
            setMatched(false);
            setChecking(false);
            return;
        }
        setChecking(true);
        const t = setTimeout(async () => {
            setMatched(await confirmCurrentEmail(e));
            setChecking(false);
        }, 450);
        return () => clearTimeout(t);
    }, [email]);

    const send = (isResend = false) => {
        setErr(null);
        if (isResend) setResendMsg(null);
        start(async () => {
            const fd = new FormData();
            fd.set("email", email.trim());
            const r = await requestPasswordReset({ ok: false }, fd);
            if (r.ok) {
                setSent(true);
                if (isResend) setResendMsg("Sent again — check your inbox.");
            } else {
                setErr(r.error ?? "Couldn't send the email. Try again shortly.");
            }
        });
    };

    if (sent) {
        return (
            <div className="cm-form">
                <p className="cm-ok">
                    Check your inbox — we sent a secure link to reset your password. It expires in 1 hour.
                </p>
                <p className="hint">
                    Didn&rsquo;t get it?{" "}
                    <button type="button" className="cm-linkbtn" onClick={() => send(true)} disabled={pending}>
                        Resend the link
                    </button>
                    {resendMsg ? ` — ${resendMsg}` : ""}
                </p>
            </div>
        );
    }

    return (
        <div className="cm-form">
            <p className="hint">
                For your security, enter your account email below to receive a one-time link — open it to
                choose a new password.
            </p>
            <div className="cm-field">
                <label htmlFor="pwEmail">Your account email</label>
                <input
                    id="pwEmail"
                    type="email"
                    className="cm-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Type your account email"
                    autoComplete="off"
                />
                <span className={`hint${matched ? " cm-match" : ""}`}>
                    {checking ? "Checking…" : matched ? "✓ Matches — you can send the link." : "Enter your account email to unlock the button."}
                </span>
            </div>
            {err && <p className="cm-err">{err}</p>}
            <button type="button" className="cm-btn" disabled={!matched || pending} onClick={() => send(false)}>
                {pending ? "Sending…" : "Email me a reset link"}
            </button>
        </div>
    );
}
