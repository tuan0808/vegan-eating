// src/app/(app)/admin/news/NewsSyncButton.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runNewsSyncNow } from "./actions";

export default function NewsSyncButton() {
    const [isPending, start] = useTransition();
    const [msg, setMsg] = useState<string | null>(null);
    const router = useRouter();

    const run = () =>
        start(async () => {
            setMsg(null);
            try {
                const r = await runNewsSyncNow();
                // Freshly fetched stories are held for review — nothing is live yet.
                // Send the editor straight to the pending queue to approve/delete.
                if (r.created > 0) {
                    setMsg(`Fetched ${r.fetched} — ${r.created} new awaiting review below.`);
                    router.push("/admin/news?view=pending");
                    router.refresh();
                } else {
                    setMsg(`Fetched ${r.fetched} — nothing new to review.`);
                }
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