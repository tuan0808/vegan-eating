// src/app/(app)/messages/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { inbox } from "@/lib/community";
import "@/styles/community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Messages — vegan eating" };

function monogram(name: string | null, username: string) {
    return (name ?? username).trim().charAt(0).toUpperCase() || "?";
}

export default async function MessagesPage() {
    const user = await requireUser();
    const conversations = await inbox(user.id);

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">Inbox</p>
            <h1 className="cm-h1">Messages</h1>
            <p className="cm-sub">Private conversations with other members.</p>

            {conversations.length === 0 ? (
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
            )}
        </div>
    );
}