// src/app/(app)/submissions/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import { getSubmission, threadHrefFor } from "@/lib/submissions";
import SubmissionActions from "@/app/(app)/admin/submissions/SubmissionActions";
import HistoryActions from "@/app/(app)/admin/submissions/HistoryActions";
import "@/styles/community.css";
import "@/app/(app)/admin/submissions/submissions.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recipe — vegan eating" };

function parseImages(raw: string): string[] {
    try {
        return JSON.parse(raw || "[]");
    } catch {
        return [];
    }
}
function lines(s: string): string[] {
    return s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function statusPill(status: string): { text: string; bg: string; color: string } {
    if (status === "APPROVED") return { text: "Published", bg: "rgba(91,107,63,0.14)", color: "#41502a" };
    if (status === "REJECTED") return { text: "Not accepted", bg: "rgba(194,96,58,0.12)", color: "#9a3f1f" };
    return { text: "In review", bg: "rgba(225,90,34,0.12)", color: "#9a3f1f" };
}

export default async function SubmissionDetailPage({ params }: { params: { id: string } }) {
    const user = await currentUser();
    if (!user) redirect("/login");

    const sub = await getSubmission(params.id);
    if (!sub) notFound();

    const isOwner = sub.userId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) redirect("/dashboard");

    const ingredients = lines(sub.ingredients);
    const method = lines(sub.method);
    const images = parseImages(sub.images);
    const pill = statusPill(sub.status);
    const times = [
        sub.prepMin != null ? `Prep ${sub.prepMin}m` : null,
        sub.cookMin != null ? `Cook ${sub.cookMin}m` : null,
        sub.readyMin != null ? `Ready ${sub.readyMin}m` : null,
    ].filter(Boolean).join(" · ");

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">
                <Link href={isAdmin && !isOwner ? "/admin/submissions" : "/dashboard"} style={{ color: "inherit" }}>
                    ← {isAdmin && !isOwner ? "Submissions" : "Dashboard"}
                </Link>
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h1 className="cm-h1" style={{ margin: 0 }}>{sub.title}</h1>
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
            <p className="cm-sub">
                {sub.dietType === "VEGETARIAN" ? "Vegetarian" : "Vegan"}
                {(sub as any).source === "VEGANIZER" ? " · from the veganizer" : ""}
                {times ? ` · ${times}` : ""}
                {" · "}
                {new Date(sub.createdAt).toLocaleDateString()}
            </p>

            {sub.status === "PENDING" && (
                <div
                    style={{
                        marginTop: 14,
                        padding: "11px 14px",
                        borderRadius: 12,
                        background: "rgba(225,90,34,.08)",
                        border: "1px solid rgba(225,90,34,.25)",
                        color: "var(--ink, #1c2317)",
                        fontSize: 13.5,
                        lineHeight: 1.5,
                    }}
                >
                    This recipe is private to you and waiting on review. A staff member needs to approve it before
                    it appears anywhere on the site.
                </div>
            )}

            {images.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginTop: 20 }}>
                    {images.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt={`${sub.title} ${i + 1}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 12, border: "1px solid var(--line, #e6e3da)" }} />
                    ))}
                </div>
            )}

            <div style={{ marginTop: 24 }}>
                <h2 style={{ fontFamily: "var(--display, 'Fraunces', serif)", fontSize: 20, margin: "0 0 10px", color: "var(--ink, #1c2317)" }}>Ingredients</h2>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, color: "var(--ink, #1c2317)" }}>
                    {ingredients.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
            </div>

            <div style={{ marginTop: 24 }}>
                <h2 style={{ fontFamily: "var(--display, 'Fraunces', serif)", fontSize: 20, margin: "0 0 10px", color: "var(--ink, #1c2317)" }}>Method</h2>
                <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, color: "var(--ink, #1c2317)" }}>
                    {method.map((m, i) => <li key={i} style={{ marginBottom: 6 }}>{m}</li>)}
                </ol>
            </div>

            {isAdmin && (
                <div style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--line, #e6e3da)" }}>
                    <p className="kicker" style={{ marginBottom: 12 }}>Moderation</p>
                    {sub.status === "PENDING" ? (
                        <SubmissionActions id={sub.id} />
                    ) : (
                        <HistoryActions
                            id={sub.id}
                            status={sub.status}
                            threadHref={threadHrefFor(sub.dietType, sub.threadSlug)}
                            recipeSlug={sub.recipeSlug ?? null}
                        />
                    )}
                </div>
            )}
        </div>
    );
}