// src/app/(app)/admin/submissions/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import {
    countPendingSubmissions,
    pendingSubmissions,
    reviewedSubmissions,
    threadHrefFor,
} from "@/lib/submissions";
import SubmissionActions from "./SubmissionActions";
import HistoryActions from "./HistoryActions";
import "./submissions.css";

export const metadata: Metadata = { title: "Recipe submissions — admin" };
export const dynamic = "force-dynamic"; // moderation queue — always fresh

function parseImages(raw: string): string[] {
    try {
        return JSON.parse(raw || "[]");
    } catch {
        return [];
    }
}

function timeBits(p: number | null, c: number | null, r: number | null) {
    const bits: string[] = [];
    if (p != null) bits.push(`Prep ${p}m`);
    if (c != null) bits.push(`Cook ${c}m`);
    if (r != null) bits.push(`Ready ${r}m`);
    return bits.join(" · ");
}

export default async function SubmissionsReviewPage({
                                                        searchParams,
                                                    }: {
    searchParams: { tab?: string };
}) {
    const user = await currentUser();
    if (!user) redirect("/login");
    if (user.role !== "ADMIN") redirect("/dashboard");

    const tab = searchParams?.tab === "history" ? "history" : "pending";
    const pendingCount = await countPendingSubmissions();

    return (
        <div className="subs-page">
            {/* NOTE: must be a <div>, not <header> — the global header rule pins
          any <header> element to the top-left corner. */}
            <div className="subs-head">
                <span className="kicker">Moderation</span>
                <h1>Recipe submissions</h1>
                <p>
                    {tab === "pending"
                        ? pendingCount === 0
                            ? "Nothing waiting — you're all caught up."
                            : `${pendingCount} waiting on review. Approving posts it as a thread under the matching forum.`
                        : "Recipes you've already approved or rejected. Pull an approved one back to remove its thread and re-review it."}
                </p>
            </div>

            <div className="subs-tabs">
                <Link href="/admin/submissions" className={`subs-tab${tab === "pending" ? " is-active" : ""}`}>
                    Pending
                    {pendingCount > 0 ? <span className="tab-count">{pendingCount}</span> : null}
                </Link>
                <Link
                    href="/admin/submissions?tab=history"
                    className={`subs-tab${tab === "history" ? " is-active" : ""}`}
                >
                    History
                </Link>
            </div>

            {tab === "pending" ? (
                <PendingList />
            ) : (
                <HistoryList />
            )}
        </div>
    );
}

/* ----------------------------- Pending ----------------------------- */

async function PendingList() {
    const subs = await pendingSubmissions();

    if (subs.length === 0) {
        return <div className="subs-empty">No pending submissions.</div>;
    }

    return (
        <div className="subs-list">
            {subs.map((s) => {
                const imgs = parseImages(s.images);
                const times = timeBits(s.prepMin, s.cookMin, s.readyMin);
                return (
                    <article className="sub-card" key={s.id}>
                        <div className="sub-card-head">
              <span className={`diet-badge diet-${s.dietType.toLowerCase()}`}>
                {s.dietType === "VEGAN" ? "Vegan" : "Vegetarian"}
              </span>
                            <h2>{s.title}</h2>
                            <p className="sub-meta">
                                by {s.authorName ?? "member"}
                                {times ? ` · ${times}` : ""} · {new Date(s.createdAt).toLocaleDateString()}
                            </p>
                        </div>

                        {imgs.length > 0 && (
                            <div className="sub-thumbs">
                                {imgs.slice(0, 6).map((src, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={i} src={src} alt={`${s.title} ${i + 1}`} />
                                ))}
                            </div>
                        )}

                        <div className="sub-cols">
                            <div>
                                <h3>Ingredients</h3>
                                <pre className="sub-pre">{s.ingredients}</pre>
                            </div>
                            <div>
                                <h3>Method</h3>
                                <pre className="sub-pre">{s.method}</pre>
                            </div>
                        </div>

                        <SubmissionActions id={s.id} />
                    </article>
                );
            })}
        </div>
    );
}

/* ----------------------------- History ----------------------------- */

async function HistoryList() {
    const subs = await reviewedSubmissions();

    if (subs.length === 0) {
        return <div className="subs-empty">Nothing reviewed yet.</div>;
    }

    return (
        <div className="hist-list">
            {subs.map((s) => (
                <div className="hist-row" key={s.id}>
                    <span className={`status-badge status-${s.status.toLowerCase()}`}>{s.status}</span>
                    <div className="hist-main">
                        <div className="hist-title">{s.title}</div>
                        <div className="hist-meta">
                            {s.dietType === "VEGAN" ? "Vegan" : "Vegetarian"} · by {s.authorName ?? "member"}
                            {s.reviewedAt ? ` · ${new Date(s.reviewedAt).toLocaleDateString()}` : ""}
                        </div>
                    </div>
                    <HistoryActions
                        id={s.id}
                        status={s.status}
                        threadHref={threadHrefFor(s.dietType, s.threadSlug)}
                        recipeSlug={s.recipeSlug ?? null}
                    />
                </div>
            ))}
        </div>
    );
}