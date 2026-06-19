// src/components/ContactReplyForm.tsx
"use client";

import { useState } from "react";
import { replyToTicket } from "@/lib/actions/contact";

export default function ContactReplyForm({ ticketId }: { ticketId: string }) {
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        const text = body.trim();
        if (!text) return;
        setBusy(true);
        setErr(null);
        try {
            const res = await replyToTicket(ticketId, text);
            if (!res.ok) {
                setErr(res.error ?? "Couldn't send. Please try again.");
                return;
            }
            setBody("");
        } catch {
            setErr("Couldn't reach the server. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <form
            onSubmit={submit}
            style={{
                marginTop: 18,
                borderTop: "1px solid var(--line, rgba(27,42,29,.12))",
                paddingTop: 16,
            }}
        >
      <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a reply…"
          rows={3}
          required
          style={{
              width: "100%",
              font: "inherit",
              border: "1px solid var(--line, rgba(27,42,29,.18))",
              borderRadius: 12,
              padding: "11px 13px",
              minHeight: 64,
              resize: "vertical",
              background: "#fffefb",
              color: "var(--ink, #1c2317)",
              boxSizing: "border-box",
          }}
      />
            {err && <p style={{ color: "#c0392b", fontSize: 13, margin: "8px 0 0", fontWeight: 600 }}>{err}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                <button
                    type="submit"
                    disabled={busy}
                    style={{
                        cursor: busy ? "default" : "pointer",
                        background: "var(--green, #2f7d38)",
                        color: "#fff",
                        border: 0,
                        fontFamily: "inherit",
                        fontWeight: 600,
                        fontSize: 15,
                        padding: "11px 24px",
                        borderRadius: 11,
                        opacity: busy ? 0.6 : 1,
                    }}
                >
                    {busy ? "Sending…" : "Send reply"}
                </button>
            </div>
        </form>
    );
}