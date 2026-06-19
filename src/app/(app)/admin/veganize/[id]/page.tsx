// src/app/(app)/admin/veganize/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import VeganizeLogActions from "@/components/admin/VeganizeLogActions";
import type { VeganizeResult } from "@/lib/veganize";
import "@/app/(app)/admin/submissions/submissions.css"; // for .btn-ghost

export const metadata: Metadata = { title: "Generation — admin" };
export const dynamic = "force-dynamic";

function parse(output: string): VeganizeResult | null {
    try {
        return JSON.parse(output) as VeganizeResult;
    } catch {
        return null;
    }
}

function statusPill(sub: { status: string } | null): { text: string; bg: string; color: string } {
    if (!sub) return { text: "Generated", bg: "rgba(27,42,29,0.07)", color: "#6f7468" };
    if (sub.status === "APPROVED") return { text: "Published", bg: "rgba(91,107,63,0.14)", color: "#41502a" };
    if (sub.status === "REJECTED") return { text: "Rejected", bg: "rgba(194,96,58,0.12)", color: "#9a3f1f" };
    return { text: "In review", bg: "rgba(225,90,34,0.12)", color: "#9a3f1f" };
}

const H2: React.CSSProperties = { fontFamily: "var(--display, 'Fraunces', serif)", fontSize: 20, margin: "24px 0 10px", color: "var(--ink, #1c2317)" };

export default async function GenerationDetailPage({ params }: { params: { id: string } }) {
    await requireRole(["ADMIN"]);

    const req = await prisma.veganizeRequest.findUnique({
        where: { id: params.id },
        include: { user: { select: { username: true, name: true } } },
    });
    if (!req) notFound();

    const sub = await prisma.recipeSubmission.findFirst({
        where: { veganizeRequestId: req.id },
        select: { id: true, status: true },
    });

    const r = parse(req.output);
    const pill = statusPill(sub);
    const who = req.user?.name ?? req.user?.username ?? "member";

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>
            <p className="kicker">
                <Link href="/admin/veganize" style={{ color: "inherit" }}>← Generation log</Link>
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                <h1 style={{ fontFamily: "var(--display, 'Fraunces', serif)", margin: 0, fontSize: 30, color: "var(--ink, #1c2317)" }}>
                    {r?.title || "Generation"}
                </h1>
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
            </div>
            <p style={{ color: "var(--muted, #6f7468)", marginTop: 6 }}>
                by {who}
                {req.user?.username ? ` (@${req.user.username})` : ""} · {new Date(req.createdAt).toLocaleString()}
                {req.ip ? ` · ${req.ip}` : ""}
            </p>

            {/* action: save to queue (if not saved) or review (if saved) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                <VeganizeLogActions requestId={req.id} submissionId={sub?.id ?? null} />
            </div>

            {r?.summary && (
                <p style={{ marginTop: 16, color: "var(--ink, #1c2317)", lineHeight: 1.6 }}>{r.summary}</p>
            )}

            {/* what the member typed */}
            <h2 style={H2}>What they typed</h2>
            <pre
                style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--ink, #1c2317)",
                    background: "#faf8f1",
                    border: "1px solid var(--line, #e6e3da)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    margin: 0,
                }}
            >
                {req.input}
            </pre>

            {r && !r.notRecipe ? (
                <>
                    {r.swaps.length > 0 && (
                        <>
                            <h2 style={H2}>Swaps</h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {r.swaps.map((s, i) => (
                                    <div key={i} style={{ fontSize: 15 }}>
                                        <span style={{ textDecoration: "line-through", color: "var(--muted, #6f7468)" }}>{s.original}</span>
                                        <span style={{ color: "var(--terra, #2F7D38)", fontWeight: 700 }}> → </span>
                                        <span style={{ fontWeight: 700, color: "var(--terra, #2F7D38)" }}>{s.substitute}</span>
                                        {s.reason ? <span style={{ color: "var(--muted, #6f7468)" }}> — {s.reason}</span> : null}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {r.ingredients.length > 0 && (
                        <>
                            <h2 style={H2}>Ingredients</h2>
                            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, color: "var(--ink, #1c2317)" }}>
                                {r.ingredients.map((g, i) => <li key={i}>{g}</li>)}
                            </ul>
                        </>
                    )}

                    {r.method.length > 0 && (
                        <>
                            <h2 style={H2}>Method</h2>
                            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, color: "var(--ink, #1c2317)" }}>
                                {r.method.map((m, i) => <li key={i} style={{ marginBottom: 6 }}>{m}</li>)}
                            </ol>
                        </>
                    )}

                    {r.notes.length > 0 && (
                        <>
                            <h2 style={H2}>Good to know</h2>
                            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, color: "var(--muted, #6f7468)" }}>
                                {r.notes.map((n, i) => <li key={i}>{n}</li>)}
                            </ul>
                        </>
                    )}
                </>
            ) : (
                <p style={{ marginTop: 20, color: "var(--muted, #6f7468)", fontStyle: "italic" }}>
                    This generation didn&rsquo;t produce a usable recipe.
                </p>
            )}
        </div>
    );
}