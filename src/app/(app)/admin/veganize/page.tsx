// src/app/(app)/admin/veganize/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { listGenerations, countGenerations } from "@/lib/veganize-admin";

export const metadata: Metadata = { title: "Veganizer log — admin" };
export const dynamic = "force-dynamic";

function titleOf(output: string): string {
    try {
        const r = JSON.parse(output);
        return r?.title || "Untitled";
    } catch {
        return "Untitled";
    }
}

function statusPill(submission: { status: string } | null): { text: string; bg: string; color: string } {
    if (!submission) return { text: "Generated", bg: "rgba(27,42,29,0.07)", color: "#6f7468" };
    if (submission.status === "APPROVED") return { text: "Published", bg: "rgba(91,107,63,0.14)", color: "#41502a" };
    if (submission.status === "REJECTED") return { text: "Rejected", bg: "rgba(194,96,58,0.12)", color: "#9a3f1f" };
    return { text: "In review", bg: "rgba(225,90,34,0.12)", color: "#9a3f1f" };
}

export default async function VeganizeLogPage() {
    await requireRole(["ADMIN"]); // redirects non-admins

    const [rows, total] = await Promise.all([listGenerations(100), countGenerations()]);

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>
            {/* must be a <div>, not <header> — global header rule pins <header> to top-left */}
            <div style={{ marginBottom: 18 }}>
                <p className="kicker">Veganizer</p>
                <h1 style={{ fontFamily: "var(--display, 'Fraunces', serif)", margin: "10px 0 6px", fontSize: 32, color: "var(--ink, #1c2317)" }}>
                    Generation log
                </h1>
                <p style={{ color: "var(--muted, #6f7468)", margin: 0 }}>
                    Every recipe the kitchen assistant has made — saved or not. {total} total. Click one to read
                    it and, if you want, save it into moderation yourself.
                </p>
                <p style={{ marginTop: 10 }}>
                    <Link href="/admin/security" style={{ color: "var(--terra, #2F7D38)", fontWeight: 600 }}>
                        ← Adjust limits
                    </Link>
                </p>
            </div>

            {rows.length === 0 ? (
                <div style={{ border: "1px dashed var(--line, #e6e3da)", borderRadius: 14, padding: 40, textAlign: "center", color: "var(--muted, #6f7468)" }}>
                    Nothing generated yet.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {rows.map((r) => {
                        const pill = statusPill(r.submission);
                        const who = r.user?.name ?? r.user?.username ?? "member";
                        return (
                            // Link is display:block (never flex on <a>); the flex row lives in the inner div.
                            <Link key={r.id} href={`/admin/veganize/${r.id}`} style={{ display: "block", textDecoration: "none" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 16,
                                        padding: "14px 18px",
                                        background: "#fff",
                                        border: "1px solid var(--line, #e6e3da)",
                                        borderRadius: 14,
                                    }}
                                >
                                    <span
                                        style={{
                                            flexShrink: 0,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            letterSpacing: "0.05em",
                                            textTransform: "uppercase",
                                            padding: "4px 9px",
                                            borderRadius: 999,
                                            background: pill.bg,
                                            color: pill.color,
                                        }}
                                    >
                                        {pill.text}
                                    </span>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: "var(--ink, #1c2317)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {titleOf(r.output)}
                                        </div>
                                        <div style={{ fontSize: 13, color: "var(--muted, #6f7468)", marginTop: 2 }}>
                                            by {who}
                                            {r.user?.username ? ` (@${r.user.username})` : ""} ·{" "}
                                            {new Date(r.createdAt).toLocaleString()}
                                            {r.ip ? ` · ${r.ip}` : ""}
                                        </div>
                                    </div>

                                    <span style={{ flexShrink: 0, color: "var(--muted, #6f7468)", fontSize: 18 }}>›</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}