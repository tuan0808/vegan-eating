// src/components/ContactThread.tsx
import { categoryLabel } from "@/lib/contact-categories";
import type { ThreadMessage } from "@/lib/contact";

function fmt(d: Date) {
    return new Date(d).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

// Renders a ticket conversation as chat bubbles. "mine" = the viewer's own
// messages (right-aligned, green); everyone else's sit left. Inline-styled so
// it drops onto any page without a stylesheet dependency.
export default function ContactThread({
                                          category,
                                          status,
                                          messages,
                                          meId,
                                      }: {
    category: string;
    status: string;
    messages: ThreadMessage[];
    meId: string;
}) {
    return (
        <div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 16,
                }}
            >
                <span className="kicker">{categoryLabel(category)}</span>
                <span
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: status === "OPEN" ? "var(--carrot, #E15A22)" : "var(--muted, #6f7468)",
                    }}
                >
          {status === "OPEN" ? "Open" : "Resolved"}
        </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {messages.map((m) => {
                    const mine = m.authorId === meId;
                    return (
                        <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "var(--muted, #6f7468)",
                                    margin: mine ? "0 4px 4px 0" : "0 0 4px 4px",
                                    textAlign: mine ? "right" : "left",
                                }}
                            >
                                {m.authorName} · {fmt(m.createdAt)}
                            </div>
                            <div
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 14,
                                    lineHeight: 1.45,
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                    background: mine ? "var(--green, #2f7d38)" : "var(--paper-2, #eceadf)",
                                    color: mine ? "#fff" : "var(--ink, #1c2317)",
                                    borderBottomRightRadius: mine ? 4 : 14,
                                    borderBottomLeftRadius: mine ? 14 : 4,
                                }}
                            >
                                {m.body}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}