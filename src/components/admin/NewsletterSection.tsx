"use client";
// src/components/admin/NewsletterSection.tsx
import { useRef, useState, useTransition } from "react";
import {
    saveNewsletterAction,
    sendTestNewsletterAction,
    sendNewsletterToAllAction,
    type State,
} from "@/lib/actions/newsletter-admin";
import ImageEmbedBar from "./ImageEmbedBar";
import MergeTagBar from "./MergeTagBar";
import BlockInserter from "./BlockInserter";

const initial: State = { ok: false, message: null };

export default function NewsletterSection({
    subject: s0,
    html: h0,
    recipientCount,
}: {
    subject: string;
    html: string;
    recipientCount: number;
}) {
    const [subject, setSubject] = useState(s0);
    const [html, setHtml] = useState(h0);
    const [confirm, setConfirm] = useState("");
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [mode, setMode] = useState<"" | "save" | "test" | "all">("");
    const [pending, start] = useTransition();
    const taRef = useRef<HTMLTextAreaElement>(null);

    const fd = () => {
        const f = new FormData();
        f.set("subject", subject);
        f.set("html", html);
        return f;
    };

    const exec = (m: "save" | "test" | "all", call: () => Promise<State>) => {
        setMsg(null);
        setMode(m);
        start(async () => {
            const r = await call();
            setMsg({ ok: r.ok, text: r.message ?? "" });
            setMode("");
            if (r.ok && m === "all") setConfirm("");
        });
    };

    const confirmed = confirm.trim().toUpperCase() === "SEND";

    return (
        <div className="ns-block">
            <label className="ns-label">Subject</label>
            <input
                className="ns-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="From the vegan eating kitchen"
            />

            <label className="ns-label">Email HTML — paste raw code, embed images, style inline</label>
            <BlockInserter taRef={taRef} value={html} onChange={setHtml} />
            <MergeTagBar taRef={taRef} value={html} onChange={setHtml} />
            <ImageEmbedBar taRef={taRef} value={html} onChange={setHtml} />
            <div className="ns-editor">
                <textarea
                    ref={taRef}
                    className="ns-html"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    spellCheck={false}
                    aria-label="Newsletter HTML"
                />
                <iframe className="ns-preview" title="Email preview" srcDoc={html} sandbox="" />
            </div>

            <div className="ns-actions">
                <button type="button" className="ns-btn" disabled={pending} onClick={() => exec("save", () => saveNewsletterAction(initial, fd()))}>
                    {pending && mode === "save" ? "Saving…" : "Save draft"}
                </button>
                <button type="button" className="ns-btn ns-btn-ghost" disabled={pending} onClick={() => exec("test", () => sendTestNewsletterAction(initial, fd()))}>
                    {pending && mode === "test" ? "Sending…" : "Send test to me"}
                </button>
                {msg ? <span className={`ns-flash ${msg.ok ? "ok" : "err"}`}>{msg.text}</span> : null}
            </div>

            <div className="ns-danger">
                <div className="ns-danger-head">
                    <b>Send to everyone</b>
                    <span>{recipientCount} recipient{recipientCount === 1 ? "" : "s"} — verified members + newsletter subscribers, minus anyone who unsubscribed. This can&rsquo;t be undone.</span>
                </div>
                <div className="ns-danger-row">
                    <input
                        className="ns-input ns-confirm"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Type SEND to confirm"
                        aria-label="Type SEND to confirm"
                    />
                    <button
                        type="button"
                        className="ns-btn ns-btn-danger"
                        disabled={pending || !confirmed || recipientCount === 0}
                        onClick={() => {
                            const f = fd();
                            f.set("confirm", confirm);
                            exec("all", () => sendNewsletterToAllAction(initial, f));
                        }}
                    >
                        {pending && mode === "all" ? "Sending…" : `Send to ${recipientCount}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
