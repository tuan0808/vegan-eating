// src/app/(app)/settings/account-form.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
    updateAccount,
    confirmCurrentEmail,
    resendMyVerification,
    type AccountResult,
} from "@/lib/actions/community";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const initial: AccountResult = { ok: false };

export default function AccountForm({ maskedEmail }: { maskedEmail: string }) {
    const [newEmail, setNewEmail] = useState("");
    const [confirm, setConfirm] = useState("");
    const [matched, setMatched] = useState(false);
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState<AccountResult | null>(null);
    const [sent, setSent] = useState(false);
    const [resendMsg, setResendMsg] = useState<string | null>(null);
    const [pending, start] = useTransition();

    // Debounced live check — the comparison runs server-side, so nothing about
    // the real email ever reaches the page.
    useEffect(() => {
        const e = confirm.trim();
        if (!e) {
            setMatched(false);
            setChecking(false);
            return;
        }
        setChecking(true);
        const t = setTimeout(async () => {
            const ok = await confirmCurrentEmail(e);
            setMatched(ok);
            setChecking(false);
        }, 450);
        return () => clearTimeout(t);
    }, [confirm]);

    const validNew = EMAIL_RE.test(newEmail.trim());
    const canSave = matched && validNew && !pending && !sent;

    const submit = () => {
        setResult(null);
        start(async () => {
            const fd = new FormData();
            fd.set("email", newEmail.trim());
            fd.set("confirmCurrent", confirm.trim());
            const r = await updateAccount(initial, fd);
            setResult(r);
            if (r.ok) setSent(true);
        });
    };

    const resend = () => {
        setResendMsg(null);
        start(async () => {
            const r = await resendMyVerification();
            setResendMsg(r.ok ? "Sent again — check your inbox." : r.error ?? "Couldn't resend.");
        });
    };

    if (sent) {
        return (
            <div className="cm-form">
                <p className="cm-ok">
                    We sent a verification link to <strong>{newEmail.trim()}</strong>. Open it to confirm
                    the change — until then, your current email stays active.
                </p>
                <p className="hint">
                    Didn&rsquo;t get it?{" "}
                    <button type="button" className="cm-linkbtn" onClick={resend} disabled={pending}>
                        Resend the link
                    </button>
                    {resendMsg ? ` — ${resendMsg}` : ""}
                </p>
            </div>
        );
    }

    return (
        <div className="cm-form">
            <div className="cm-field">
                <label>Current email</label>
                <div className="cm-masked">{maskedEmail}</div>
            </div>

            <p className="cm-note">
                For your security your email is hidden, and it can only be changed <strong>once every
                24 hours</strong>. Confirm your current email to unlock saving, then verify the new one.
            </p>

            <div className="cm-field">
                <label htmlFor="newEmail">New email address</label>
                <input
                    id="newEmail"
                    type="email"
                    className="cm-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="off"
                />
            </div>

            <div className="cm-field">
                <label htmlFor="confirmCurrent">Confirm your current email address</label>
                <input
                    id="confirmCurrent"
                    type="email"
                    className="cm-input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type your current email exactly"
                    autoComplete="off"
                />
                <span className={`hint${matched ? " cm-match" : ""}`}>
                    {checking ? "Checking…" : matched ? "✓ Matches — you can save." : "Enter your current email to unlock saving."}
                </span>
            </div>

            {result?.error && <p className="cm-err">{result.error}</p>}

            <button type="button" className="cm-btn" disabled={!canSave} onClick={submit}>
                {pending ? "Saving…" : "Save email"}
            </button>
        </div>
    );
}
