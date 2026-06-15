// src/app/(app)/dashboard/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import {
    latestRecipesFeed,
    unreadMessageCount,
    pendingPostCount,
    inbox,
} from "@/lib/community";
import { needsOnboarding, welcomeHref } from "@/lib/onboarding";
import "@/styles/community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — vegan eating" };

function hello() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}

function monogram(name: string | null, username: string) {
    return (name ?? username).trim().charAt(0).toUpperCase() || "?";
}

export default async function DashboardPage() {
    const user = await requireUser();

    const [recipes, unread, pending, conversations, mustOnboard] = await Promise.all([
        latestRecipesFeed(6),
        unreadMessageCount(user.id),
        pendingPostCount(user.id),
        inbox(user.id),
        needsOnboarding(user.id),
    ]);

    const inboxPreview = conversations.slice(0, 4);

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">Dashboard</p>
            <h1 className="cm-h1">
                {hello()}, {user.name ?? user.username}
            </h1>
            <p className="cm-sub">
                Here&apos;s what&apos;s waiting for you and what&apos;s fresh in the kitchen.
            </p>

            {mustOnboard && (
                <a
                    href={welcomeHref()}
                    style={{
                        display: "block",
                        marginTop: 18,
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: "1px solid #5b6b3f",
                        background: "#eef0e7",
                        color: "#3f4a2b",
                        textDecoration: "none",
                        lineHeight: 1.5,
                    }}
                >
                    <strong>Read the Welcome post to start posting.</strong> Head to General → News and
                    open “Welcome to the forums.” Once you&apos;ve viewed it, commenting and forum posting
                    unlock across the site.
                </a>
            )}

            {/* notification snapshot */}
            <div className="cm-stats">
                <Link href="/messages" className="cm-stat" style={{ textDecoration: "none" }}>
                    <div className="n">
                        {unread}
                        {unread > 0 && <span className="badge">new</span>}
                    </div>
                    <div className="l">Unread messages</div>
                </Link>
                <Link href="/activity" className="cm-stat" style={{ textDecoration: "none" }}>
                    <div className="n">{pending}</div>
                    <div className="l">Posts in review</div>
                </Link>
                <div className="cm-stat">
                    <div className="n">{conversations.length}</div>
                    <div className="l">Conversations</div>
                </div>
            </div>

            {/* inbox preview */}
            <div className="cm-sec">
                <h2>Inbox</h2>
                <Link href="/messages">View all</Link>
            </div>
            {inboxPreview.length === 0 ? (
                <div className="cm-empty">No messages yet. When someone writes to you, it&apos;ll land here.</div>
            ) : (
                <div className="cm-list">
                    {inboxPreview.map((c) => (
                        <Link key={c.partner.id} href={`/messages/${c.partner.username}`} className="cm-card">
                            {c.partner.avatarUrl ? (
                                <img className="cm-av" src={c.partner.avatarUrl} alt="" />
                            ) : (
                                <div className="cm-mono">{monogram(c.partner.name, c.partner.username)}</div>
                            )}
                            <div className="meta">
                                <span className="t">{c.partner.name ?? c.partner.username}</span>
                                <span className="d">
                  {c.lastMessage.fromMe ? "You: " : ""}
                                    {c.lastMessage.body}
                </span>
                            </div>
                            {c.unread > 0 && <span className="cm-unread">{c.unread}</span>}
                        </Link>
                    ))}
                </div>
            )}

            {/* latest recipes */}
            <div className="cm-sec">
                <h2>Fresh on the site</h2>
                <Link href="/recipes">All recipes</Link>
            </div>
            <div className="cm-list">
                {recipes.map((r) => (
                    <Link key={r.id} href={`/recipes/${r.slug}`} className="cm-card">
                        {r.image ? (
                            <img className="cm-thumb" src={r.image} alt="" />
                        ) : (
                            <div className="cm-thumb" />
                        )}
                        <div className="meta">
                            <span className="t">{r.title}</span>
                            <span className="d">
                {r.recipeType}
                                {r.date ? ` · ${r.date}` : ""}
              </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}