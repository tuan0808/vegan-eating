// src/app/(app)/activity/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import {
    myPendingPosts,
    myThreads,
    repliesToMyThreads,
    threadHref,
} from "@/lib/community";
import { savedRecipes, myReviews } from "@/lib/kitchen";
import "@/styles/community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My activity — vegan eating" };

function ago(d: Date) {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return new Date(d).toLocaleDateString();
}

const snippet = (html: string, n = 90) => {
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text.length > n ? text.slice(0, n) + "…" : text;
};

export default async function ActivityPage() {
    const user = await requireUser();
    const [pending, threads, replies, saved, reviews] = await Promise.all([
        myPendingPosts(user.id),
        myThreads(user.id),
        repliesToMyThreads(user.id),
        savedRecipes(user.id),
        myReviews(user.id),
    ]);

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">Activity</p>
            <h1 className="cm-h1">My activity</h1>
            <p className="cm-sub">Your saved recipes, reviews, and forum activity in one place.</p>

            {/* Saved recipes */}
            <div className="cm-sec">
                <h2>Saved recipes</h2>
                <Link href="/shopping-list">Shopping list →</Link>
            </div>
            {saved.length === 0 ? (
                <div className="cm-empty">
                    No saved recipes yet. Tap the heart on any recipe to keep it here.
                </div>
            ) : (
                <div className="cm-list">
                    {saved.map((r) => (
                        <Link key={r.id} href={`/recipes/${r.slug}`} className="cm-card">
                            {r.image ? <img className="cm-thumb" src={r.image} alt="" /> : <div className="cm-thumb" />}
                            <div className="meta">
                                <span className="t">{r.title}</span>
                                <span className="d">{r.recipeType}</span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* My reviews */}
            <div className="cm-sec">
                <h2>Your reviews</h2>
            </div>
            {reviews.length === 0 ? (
                <div className="cm-empty">You haven&apos;t rated any recipes yet.</div>
            ) : (
                <div className="cm-list">
                    {reviews.map((rv) => (
                        <Link key={rv.recipe.slug} href={`/recipes/${rv.recipe.slug}`} className="cm-card">
                            {rv.recipe.image ? (
                                <img className="cm-thumb" src={rv.recipe.image} alt="" />
                            ) : (
                                <div className="cm-thumb" />
                            )}
                            <div className="meta">
                                <span className="t">{rv.recipe.title}</span>
                                <span className="d">
                  {"★".repeat(rv.score)}
                                    {"☆".repeat(5 - rv.score)}
                                    {rv.review ? ` · ${rv.review}` : ""}
                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pending */}
            <div className="cm-sec">
                <h2>Awaiting moderation</h2>
                {pending.length > 0 && <span className="cm-pill">{pending.length}</span>}
            </div>
            {pending.length === 0 ? (
                <div className="cm-empty">Nothing in the queue — all your posts are live.</div>
            ) : (
                <div className="cm-list">
                    {pending.map((p) => (
                        <Link key={p.id} href={threadHref(p.thread)} className="cm-card">
                            <div className="meta">
                                <span className="t">{p.thread.title}</span>
                                <span className="d">{snippet(p.body)}</span>
                            </div>
                            <span className="cm-pill">Pending</span>
                        </Link>
                    ))}
                </div>
            )}

            {/* Replies to my threads */}
            <div className="cm-sec">
                <h2>Replies to your topics</h2>
            </div>
            {replies.length === 0 ? (
                <div className="cm-empty">No replies yet.</div>
            ) : (
                <div className="cm-list">
                    {replies.map((r) => (
                        <Link key={r.id} href={threadHref(r.thread)} className="cm-card">
                            <div className="meta">
                <span className="t">
                  {r.author.name ?? r.author.username} replied in “{r.thread.title}”
                </span>
                                <span className="d">{snippet(r.body)}</span>
                            </div>
                            <span className="d" style={{ flex: "none" }}>
                {ago(r.createdAt)}
              </span>
                        </Link>
                    ))}
                </div>
            )}

            {/* My threads */}
            <div className="cm-sec">
                <h2>Topics you started</h2>
                <span className="cm-pill">{threads.length}</span>
            </div>
            {threads.length === 0 ? (
                <div className="cm-empty">You haven&apos;t started any topics yet.</div>
            ) : (
                <div className="cm-list">
                    {threads.map((t) => (
                        <Link key={t.id} href={threadHref(t)} className="cm-card">
                            <div className="meta">
                                <span className="t">{t.title}</span>
                                <span className="d">
                  {t.forum?.name ?? "Forum"} · {t._count.posts} repl
                                    {t._count.posts === 1 ? "y" : "ies"} · last activity {ago(t.lastPostAt)}
                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}