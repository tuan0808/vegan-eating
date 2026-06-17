// src/app/(app)/admin/news/RescanDuplicatesButton.tsx
"use client";

import { useState, useTransition } from "react";
import { rescanNewsDuplicates } from "./actions";

// Triggers the one-time (re-runnable) duplicate backfill. Safe to press anytime;
// it only flags exact-title copies that aren't already hidden/flagged.
export default function RescanDuplicatesButton() {
    const [pending, start] = useTransition();
    const [msg, setMsg] = useState<string | null>(null);

    const run = () =>
        start(async () => {
            setMsg(null);
            try {
                const r = await rescanNewsDuplicates();
                setMsg(
                    r.flagged
                        ? `Flagged ${r.flagged} duplicate${r.flagged === 1 ? "" : "s"} across ${r.groups} group${r.groups === 1 ? "" : "s"}.`
                        : "No new duplicates found.",
                );
            } catch {
                setMsg("Scan failed — try again.");
            }
        });

    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <button type="button" className="ar-quick" onClick={run} disabled={pending}>
                {pending ? "Scanning…" : "Re-scan for duplicates"}
            </button>
            {msg && <span style={{ fontSize: 13, color: "var(--muted,#6b7264)" }}>{msg}</span>}
        </span>
    );
}