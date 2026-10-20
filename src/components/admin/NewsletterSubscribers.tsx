// src/components/admin/NewsletterSubscribers.tsx
// Read-only list of everyone the next broadcast would reach: verified members
// (auto-subscribed at signup) plus legacy email-only subscribers, minus opt-outs.
import Link from "next/link";
import type { Subscriber } from "@/lib/actions/newsletter-admin";

export default function NewsletterSubscribers({ subscribers }: { subscribers: Subscriber[] }) {
    const members = subscribers.filter((s) => s.username).length;
    return (
        <div className="ns-block" style={{ marginTop: 28 }}>
            <div className="ns-label">
                Subscribers — {subscribers.length} ({members} member{members === 1 ? "" : "s"}, {subscribers.length - members} email-only)
            </div>
            {subscribers.length === 0 ? (
                <p style={{ fontSize: 14, color: "var(--muted, #7c7666)" }}>No one is subscribed yet.</p>
            ) : (
                <div style={{ maxHeight: 420, overflow: "auto", border: "1px solid var(--line, #e6e3d8)", borderRadius: 10, background: "#fff" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                        <thead>
                            <tr style={{ textAlign: "left", position: "sticky", top: 0, background: "#f7f5ee" }}>
                                <th style={{ padding: "8px 12px" }}>Email</th>
                                <th style={{ padding: "8px 12px" }}>Member</th>
                                <th style={{ padding: "8px 12px" }}>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscribers.map((s) => (
                                <tr key={s.email} style={{ borderTop: "1px solid var(--line, #e6e3d8)" }}>
                                    <td style={{ padding: "7px 12px", wordBreak: "break-all" }}>{s.email}</td>
                                    <td style={{ padding: "7px 12px" }}>
                                        {s.username ? <Link href={`/u/${s.username}`}>@{s.username}</Link> : <span style={{ color: "var(--muted, #7c7666)" }}>email only</span>}
                                    </td>
                                    <td style={{ padding: "7px 12px", whiteSpace: "nowrap" }}>
                                        {s.joinedAt ? new Date(s.joinedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
