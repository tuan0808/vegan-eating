// src/components/admin/PendingPosts.tsx
// Drop into the dashboard. Renders for moderators/admins only; the approve and
// reject actions are independently role-gated on the server.
import Link from "next/link";
import { currentUser } from "@/lib/auth-helpers";
import { getPendingPosts } from "@/lib/post-moderation";
import { getAntiSpamConfig } from "@/lib/antispam-config";
import { toText } from "@/lib/spam-heuristics";
import PostModActions from "./PostModActions";
import "./pending-posts.css";

function snippet(html: string, max = 220): string {
    const t = toText(html);
    return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

function ago(date: Date): string {
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default async function PendingPosts() {
    const user = await currentUser();
    if (!user || (user.role !== "MODERATOR" && user.role !== "ADMIN")) return null;

    const [posts, cfg] = await Promise.all([getPendingPosts(), getAntiSpamConfig()]);
    const probationMs = cfg.probationMs;

    return (
        <section className="pp-panel">
            <div className="pp-head">
                <h2 className="pp-title">Replies awaiting review</h2>
                {posts.length > 0 ? <span className="pp-count">{posts.length}</span> : null}
            </div>

            {posts.length === 0 ? (
                <p className="pp-empty">You're all caught up — nothing waiting.</p>
            ) : (
                <ul className="pp-list">
                    {posts.map((p) => {
                        const isNew = Date.now() - p.authorJoinedAt.getTime() < probationMs;
                        return (
                            <li key={p.id} className="pp-item">
                                <div className="pp-meta">
                                    <span className="pp-author">{p.authorName}</span>
                                    {isNew ? <span className="pp-new">new account</span> : null}
                                    <span className="pp-dot">·</span>
                                    <span className="pp-when">{ago(p.createdAt)}</span>
                                    <span className="pp-dot">·</span>
                                    <Link href={p.threadHref} className="pp-thread">{p.threadTitle}</Link>
                                </div>
                                <p className="pp-body">{snippet(p.body)}</p>
                                <PostModActions postId={p.id} />
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}