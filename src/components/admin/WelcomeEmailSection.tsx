"use client";
// src/components/admin/WelcomeEmailSection.tsx
import { useRef, useState, useTransition } from "react";
import { saveWelcomeAction, sendTestWelcomeAction, type State } from "@/lib/actions/newsletter-admin";
import ImageEmbedBar from "./ImageEmbedBar";
import MergeTagBar from "./MergeTagBar";

const initial: State = { ok: false, message: null };

export default function WelcomeEmailSection({
    enabled: e0,
    testMode: t0,
    subject: s0,
    html: h0,
    defaultSubject,
    defaultHtml,
}: {
    enabled: boolean;
    testMode: boolean;
    subject: string;
    html: string;
    defaultSubject: string;
    defaultHtml: string;
}) {
    const [enabled, setEnabled] = useState(e0);
    const [testMode, setTestMode] = useState(t0);
    const [subject, setSubject] = useState(s0);
    const [html, setHtml] = useState(h0);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [mode, setMode] = useState<"" | "save" | "test">("");
    const [pending, start] = useTransition();
    const taRef = useRef<HTMLTextAreaElement>(null);

    const fd = () => {
        const f = new FormData();
        if (enabled) f.set("enabled", "on");
        if (testMode) f.set("testMode", "on");
        f.set("subject", subject);
        f.set("html", html);
        return f;
    };

    const exec = (m: "save" | "test", call: () => Promise<State>) => {
        setMsg(null);
        setMode(m);
        start(async () => {
            const r = await call();
            setMsg({ ok: r.ok, text: r.message ?? "" });
            setMode("");
        });
    };

    return (
        <div className="ns-block">
            <label className="ns-check">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <span>Send a warm welcome email when a member verifies their email</span>
            </label>
            <label className="ns-check">
                <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
                <span><b>Test mode</b> — route the welcome to the admin only, so real members aren&rsquo;t emailed until you&rsquo;ve approved how it looks. Turn off to go live.</span>
            </label>

            <label className="ns-label">Subject</label>
            <input className="ns-input" value={subject} onChange={(e) => setSubject(e.target.value)} />

            <label className="ns-label">Email HTML</label>
            <MergeTagBar taRef={taRef} value={html} onChange={setHtml} />
            <ImageEmbedBar taRef={taRef} value={html} onChange={setHtml} />
            <div className="ns-editor">
                <textarea
                    ref={taRef}
                    className="ns-html"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    spellCheck={false}
                    aria-label="Welcome email HTML"
                />
                <iframe
                    className="ns-preview"
                    title="Welcome email preview"
                    srcDoc={html
                        .replace(/\{\{\s*name\s*\}\}/gi, "there")
                        .replace(/\{\{\s*email\s*\}\}/gi, "you@example.com")
                        .replace(/\{\{\s*category_cards\s*\}\}/gi, '<div style="padding:16px;background:#eee;border-radius:10px;color:#777;font:13px sans-serif;text-align:center">[ 2 random category cards — inserted when the email sends ]</div>')
                        .replace(/\{\{\s*latest_thread\s*\}\}/gi, '<div style="padding:16px;background:#eee;border-radius:10px;color:#777;font:13px sans-serif;text-align:center">[ latest forum thread — inserted when the email sends ]</div>')}
                    sandbox=""
                />
            </div>

            <div className="ns-actions">
                <button type="button" className="ns-btn" disabled={pending} onClick={() => exec("save", () => saveWelcomeAction(initial, fd()))}>
                    {pending && mode === "save" ? "Saving…" : "Save welcome email"}
                </button>
                <button type="button" className="ns-btn ns-btn-ghost" disabled={pending} onClick={() => exec("test", () => sendTestWelcomeAction(initial, fd()))}>
                    {pending && mode === "test" ? "Sending…" : "Send test welcome to me"}
                </button>
                <button type="button" className="ns-btn ns-btn-ghost" disabled={pending} onClick={() => { setSubject(defaultSubject); setHtml(defaultHtml); }}>
                    Load default template
                </button>
                {msg ? <span className={`ns-flash ${msg.ok ? "ok" : "err"}`}>{msg.text}</span> : null}
            </div>
        </div>
    );
}
