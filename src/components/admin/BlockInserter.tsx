"use client";
// src/components/admin/BlockInserter.tsx
// Paste a veganeating.com URL → fetch its data → drop a formatted section into
// the newsletter HTML at the cursor.
import type { RefObject } from "react";
import { useState, useTransition } from "react";
import { recipeBlock, dispatchBlock, worthReadBlock, forumBlock, type BlockResult } from "@/lib/actions/newsletter-blocks";

export default function BlockInserter({
    taRef,
    value,
    onChange,
}: {
    taRef: RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (v: string) => void;
}) {
    const [dispatchUrl, setDispatchUrl] = useState("");
    const [recipeUrl, setRecipeUrl] = useState("");
    const [readA, setReadA] = useState("");
    const [readB, setReadB] = useState("");
    const [forumUrl, setForumUrl] = useState("");
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [pending, start] = useTransition();

    const insertAtCursor = (snippet: string) => {
        const ta = taRef.current;
        if (!ta) {
            onChange(value + "\n" + snippet);
            return;
        }
        const s = ta.selectionStart ?? value.length;
        const e = ta.selectionEnd ?? value.length;
        onChange(value.slice(0, s) + snippet + value.slice(e));
        requestAnimationFrame(() => {
            ta.focus();
            const pos = s + snippet.length;
            ta.setSelectionRange(pos, pos);
        });
    };

    const run = (key: string, call: () => Promise<BlockResult>) => {
        setMsg(null);
        setBusy(key);
        start(async () => {
            const r = await call();
            if (r.ok && r.html) {
                insertAtCursor(r.html);
                setMsg({ ok: true, text: "Block inserted at cursor ✓" });
            } else {
                setMsg({ ok: false, text: r.error ?? "Couldn't build that block." });
            }
            setBusy(null);
        });
    };

    return (
        <div className="ns-blocks">
            <div className="ns-blocks-title">Smart blocks — paste a URL, click Insert to drop the formatted section at your cursor</div>

            <div className="ns-block-row">
                <span className="ns-block-label">Daily Dispatch</span>
                <input className="ns-input ns-block-input" value={dispatchUrl} onChange={(e) => setDispatchUrl(e.target.value)} placeholder="https://veganeating.com/news/…" />
                <button type="button" className="ns-btn" disabled={pending || !dispatchUrl.trim()} onClick={() => run("dispatch", () => dispatchBlock(dispatchUrl))}>
                    {busy === "dispatch" ? "…" : "Insert"}
                </button>
            </div>

            <div className="ns-block-row">
                <span className="ns-block-label">Recipe of the week</span>
                <input className="ns-input ns-block-input" value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)} placeholder="https://veganeating.com/recipes/…" />
                <button type="button" className="ns-btn" disabled={pending || !recipeUrl.trim()} onClick={() => run("recipe", () => recipeBlock(recipeUrl))}>
                    {busy === "recipe" ? "…" : "Insert"}
                </button>
            </div>

            <div className="ns-block-row">
                <span className="ns-block-label">Worth a read</span>
                <input className="ns-input ns-block-input" value={readA} onChange={(e) => setReadA(e.target.value)} placeholder="Article or news URL" />
                <input className="ns-input ns-block-input" value={readB} onChange={(e) => setReadB(e.target.value)} placeholder="Second URL (optional)" />
                <button type="button" className="ns-btn" disabled={pending || !readA.trim()} onClick={() => run("read", () => worthReadBlock(readA, readB))}>
                    {busy === "read" ? "…" : "Insert"}
                </button>
            </div>

            <div className="ns-block-row">
                <span className="ns-block-label">From the forum</span>
                <input className="ns-input ns-block-input" value={forumUrl} onChange={(e) => setForumUrl(e.target.value)} placeholder="https://veganeating.com/forum/…/…/thread" />
                <button type="button" className="ns-btn" disabled={pending || !forumUrl.trim()} onClick={() => run("forum", () => forumBlock(forumUrl))}>
                    {busy === "forum" ? "…" : "Insert"}
                </button>
            </div>

            {msg ? <span className={`ns-flash ${msg.ok ? "ok" : "err"}`}>{msg.text}</span> : null}
        </div>
    );
}
