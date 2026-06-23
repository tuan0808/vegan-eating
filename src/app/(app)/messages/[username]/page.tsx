// src/app/(app)/messages/[username]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { conversationWith, unreadMessageCount } from "@/lib/community";
import { sendMessage } from "@/lib/actions/community";
import "@/styles/community.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
                                           params: paramsP,
                                       }: {
    params: Promise<{ username: string }>;
}): Promise<Metadata> {
    const params = await paramsP;
    return { title: `Chat with ${params.username} — vegan eating` };
}

function fmt(d: Date) {
    return new Date(d).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default async function ConversationPage({
                                                   params: paramsP,
                                               }: {
    params: Promise<{ username: string }>;
}) {
    const params = await paramsP;
    const me = await requireUser();
    const convo = await conversationWith(me.id, params.username);
    if (!convo) notFound();

    // Mark anything they sent me as read on open. No revalidate during render —
    // the inbox/dashboard are force-dynamic and refresh on next visit.
    await prisma.message.updateMany({
        where: { senderId: convo.partner.id, recipientId: me.id, readAt: null },
        data: { readAt: new Date() },
    });

    // Unread still waiting in your OTHER conversations (this one was just
    // marked read above), so the back link can flag there's more to see.
    const otherUnread = await unreadMessageCount(me.id);

    const { partner, messages } = convo;

    return (
        <div className="cm">
            <p className="cm-kicker">
                <Link href="/messages" style={{ color: "inherit" }}>
                    ← Inbox
                    {otherUnread > 0 && (
                        <span style={{ display: "inline-grid", placeItems: "center", minWidth: 17, height: 17, padding: "0 5px", marginLeft: 7, borderRadius: 999, background: "var(--accent, #5b6b3f)", color: "#fff", fontSize: 10.5, fontWeight: 700, lineHeight: 1, verticalAlign: "middle" }}>
                            {otherUnread > 99 ? "99+" : otherUnread}
                        </span>
                    )}
                </Link>
            </p>
            <h1 className="cm-h1">
                <Link href={`/u/${partner.username}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {partner.name ?? partner.username}
                </Link>
            </h1>

            <div className="cm-convo">
                {messages.length === 0 ? (
                    <div className="cm-empty">No messages yet — say hello.</div>
                ) : (
                    messages.map((m) => {
                        const mine = m.senderId === me.id;
                        return (
                            <div key={m.id} className={`cm-bub ${mine ? "me" : "them"}`}>
                                {m.body}
                                <time>{fmt(m.createdAt)}</time>
                            </div>
                        );
                    })
                )}
            </div>

            <form action={sendMessage} className="cm-compose">
                <input type="hidden" name="to" value={partner.username} />
                <textarea
                    className="cm-textarea"
                    name="body"
                    placeholder={`Message ${partner.name ?? partner.username}…`}
                    required
                />
                <button type="submit" className="cm-btn">
                    Send
                </button>
            </form>
        </div>
    );
}