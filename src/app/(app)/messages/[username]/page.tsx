// src/app/(app)/messages/[username]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { conversationWith } from "@/lib/community";
import { sendMessage } from "@/lib/actions/community";
import "@/styles/community.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
                                           params,
                                       }: {
    params: { username: string };
}): Promise<Metadata> {
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
                                                   params,
                                               }: {
    params: { username: string };
}) {
    const me = await requireUser();
    const convo = await conversationWith(me.id, params.username);
    if (!convo) notFound();

    // Mark anything they sent me as read on open. No revalidate during render —
    // the inbox/dashboard are force-dynamic and refresh on next visit.
    await prisma.message.updateMany({
        where: { senderId: convo.partner.id, recipientId: me.id, readAt: null },
        data: { readAt: new Date() },
    });

    const { partner, messages } = convo;

    return (
        <div className="cm">
            <p className="cm-kicker">
                <Link href="/messages" style={{ color: "inherit" }}>
                    ← Inbox
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