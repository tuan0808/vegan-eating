// src/app/(app)/admin/news/NewsQueryPanel.tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveNewsQuery, type SaveState } from "@/lib/actions/news-query";
import "@/components/admin/antispam-panel.css"; // provides the .as-* chrome (card, buttons, flash)

const initialState: SaveState = { ok: false, message: null };

function Foot({ flash }: { flash: SaveState | null }) {
    const { pending } = useFormStatus();
    return (
        <div className="as-form-foot" style={{ flexWrap: "wrap", gap: 10 }}>
            <button type="submit" name="action" value="save" className="as-save" disabled={pending}>
                {pending ? "Saving…" : "Save query"}
            </button>
            <button
                type="submit"
                name="action"
                value="reset"
                className="as-save"
                style={{ background: "transparent", color: "var(--terra,#2F7D38)", border: "1px solid var(--terra,#2F7D38)" }}
                disabled={pending}
            >
                Reset to default
            </button>
            {flash?.message ? (
                <span className={`as-flash ${flash.ok ? "ok" : "err"}`} role="status">
                    {flash.ok ? "✓ " : ""}
                    {flash.message}
                </span>
            ) : null}
        </div>
    );
}

export default function NewsQueryPanel({ current }: { current: string }) {
    const [state, formAction] = useActionState(saveNewsQuery, initialState);
    const [flash, setFlash] = useState<SaveState | null>(null);

    useEffect(() => {
        if (!state.key) return;
        setFlash(state);
        const t = setTimeout(() => setFlash(null), 3000);
        return () => clearTimeout(t);
    }, [state.key]);

    return (
        <details className="as-panel" style={{ marginBottom: 18 }}>
            <summary style={{ cursor: "pointer", listStyle: "none" }}>
                <span className="as-kicker">Newsdata</span>
                <h2 className="as-title" style={{ display: "inline-block", marginLeft: 8 }}>
                    Fetch query
                </h2>
            </summary>

            <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.5, color: "var(--muted,#6b7264)" }}>
                Paste the newsdata.io query — the params or the full URL. The API key is always taken from your
                environment (<code>NEWSDATA_API_KEY</code>) and is never stored here, so leave it out or it'll be
                stripped. Saving takes effect on the next fetch — no rebuild.
            </p>

            <form action={formAction} className="as-form" style={{ marginTop: 12 }}>
                <textarea
                    key={current}
                    name="query"
                    defaultValue={current}
                    rows={6}
                    spellCheck={false}
                    style={{
                        width: "100%",
                        resize: "vertical",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 13,
                        lineHeight: 1.5,
                        padding: "12px 14px",
                        border: "1px solid var(--line,#d9d5c8)",
                        borderRadius: 10,
                        background: "#fffefb",
                        color: "var(--ink,#1c2317)",
                    }}
                />
                <Foot flash={flash} />
            </form>
        </details>
    );
}