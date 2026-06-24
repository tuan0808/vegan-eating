// src/app/(app)/messages/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { inbox, unreadMessageCount } from "@/lib/community";
import { listContactMessages, openContactCount } from "@/lib/contact";
import { categoryLabel } from "@/lib/contact-categories";
import { setContactStatus } from "@/lib/actions/contact";
import "@/styles/community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages — vegan eating" };

function monogram(name: string | null, username: string) {
    return (name ?? username).trim().charAt(0).toUpperCase() || "?";
}

function fmt(d: Date) {
    return new Date(d).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

// Small count chip for the tabs — uses the page's green accent, like the
// per-conversation unread pills, so it sits in with the existing styling.
const tabNoti = {
    display: "inline-grid",
    placeItems: "center",
    minWidth: 18,
    height: 18,
    padding: "0 6px",
    marginLeft: 7,
    borderRadius: 999,
    background: "var(--accent, #5b6b3f)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    verticalAlign: "middle",
} as const;

export default async function MessagesPage({
                                               searchParams,
                                           }: {
    searchParams?: Promise<{ tab?: string }>;
}) {
    const user = await requireUser();
    const isAdmin = user.role === "ADMIN";
    const sp = await searchParams;
    // Only admins can land on the Website tab; everyone else stays on Forum.
    const tab = isAdmin && sp?.tab === "website" ? "website" : "forum";

    const conversations = tab === "forum" ? await inbox(user.id) : [];
    const inquiries = tab === "website" ? await listContactMessages() : [];

    // Per-tab markers so the admin can see which tab has waiting items without
    // opening both. Cheap indexed counts; only needed when the tab bar shows.
    let unread = 0;
    let openInq = 0;
    if (isAdmin) {
        unread = await unreadMessageCount(user.id);
        try {
            openInq = await openContactCount();
        } catch {
            openInq = 0;
        }
    }

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">Inbox</p>
            <h1 className="cm-h1">Messages</h1>
            <p className="cm-sub">
                {tab === "website"
                    ? "Inquiries sent through the site's contact form."
                    : "Private conversations with other members."}
            </p>

            {isAdmin && (
                <div className="cm-tabs" style={{ marginTop: 18 }}>
                    <Link href="/messages" className={`cm-tab${tab === "forum" ? " active" : ""}`}>
                        Forum
                        {unread > 0 && <span style={tabNoti}>{unread > 99 ? "99+" : unread}</span>}
                    </Link>
                    <Link href="/messages?tab=website" className={`cm-tab${tab === "website" ? " active" : ""}`}>
                        Website
                        {openInq > 0 && <span style={tabNoti}>{openInq > 99 ? "99+" : openInq}</span>}
                    </Link>
                </div>
            )}

            {tab === "forum" ? (
                conversations.length === 0 ? (
                    <div className="cm-empty" style={{ marginTop: 22 }}>
                        No conversations yet. Visit a member&apos;s profile and hit{" "}
                        <strong>Message</strong> to start one.
                    </div>
                ) : (
                    <div className="cm-list" style={{ marginTop: 22 }}>
                        {conversations.map((c) => (
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
                )
            ) : inquiries.length === 0 ? (
                <div className="cm-empty" style={{ marginTop: 22 }}>No website inquiries yet.</div>
            ) : (
                <div className="cm-list" style={{ marginTop: 22 }}>
                    {inquiries.map((m) => (
                        <div
                            key={m.id}
                            className="cm-card"
                            style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div className="cm-mono">{monogram(m.name, m.user.username)}</div>
                                <div className="meta" style={{ flex: 1 }}>
                                    <span className="t">
                                        {m.name} <span className="cm-pill">{categoryLabel(m.category)}</span>
                                    </span>
                                    <span className="d">@{m.user.username} · {fmt(m.createdAt)}</span>
                                </div>
                                <span
                                    className="cm-pill"
                                    style={
                                        m.status === "OPEN"
                                            ? { background: "var(--accent)", color: "#fff" }
                                            : undefined
                                    }
                                >
                                    {m.status === "OPEN" ? "Open" : "Handled"}
                                </span>
                            </div>

                            <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.body}</p>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <Link href={`/messages/website/${m.id}`} className="cm-btn ghost">
                                    Open conversation
                                </Link>
                                <form action={setContactStatus.bind(null, m.id, m.status === "OPEN" ? "HANDLED" : "OPEN")}>
                                    <button type="submit" className="cm-btn ghost">
                                        {m.status === "OPEN" ? "Mark handled" : "Reopen"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}