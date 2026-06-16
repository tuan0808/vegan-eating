// src/app/(app)/admin/news/NewsSyncButton.tsx
"use client";

import { useState, useTransition } from "react";
import { runNewsSyncNow } from "./actions";

export default function NewsSyncButton() {
    const [isPending, start] = useTransition();
    const [msg, setMsg] = useState<string | null>(null);

    const run = () =>
        start(async () => {
            setMsg(null);
            try {
                const r = await runNewsSyncNow();
                setMsg(`Synced — ${r.saved} stored, ${r.fetched} fetched.`);
            } catch (e) {
                setMsg(`Sync failed: ${e instanceof Error ? e.message : String(e)}`);
            }
        });

    return (
        <span className="ar-syncwrap">
      <button type="button" className="ar-export" onClick={run} disabled={isPending}>
        {isPending ? "Fetching…" : "⟳ Fetch latest news"}
      </button>
            {msg && (
                <span style={{ marginLeft: 10, fontSize: 13, color: "var(--muted, #6b7568)" }}>{msg}</span>
            )}
    </span>
    );
}