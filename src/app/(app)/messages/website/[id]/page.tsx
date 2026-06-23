// src/app/(app)/messages/website/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth-helpers";
import { getTicketById, threadMessages } from "@/lib/contact";
import { setContactStatus } from "@/lib/actions/contact";
import ContactThread from "@/components/ContactThread";
import ContactReplyForm from "@/components/ContactReplyForm";
import "@/styles/community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inquiry — vegan eating" };

export default async function TicketPage({ params: paramsP }: { params: Promise<{ id: string }> }) {
    const params = await paramsP;
    const me = await requireRole(["ADMIN"]);
    const ticket = await getTicketById(params.id);
    if (!ticket) notFound();

    const messages = threadMessages(ticket);

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">
                <Link href="/messages?tab=website" style={{ color: "inherit" }}>← Website inquiries</Link>
            </p>
            <h1 className="cm-h1">{ticket.name}</h1>
            <p className="cm-sub">@{ticket.user.username}</p>

            <div className="tool-box" style={{ marginTop: 18 }}>
                <ContactThread
                    category={ticket.category}
                    status={ticket.status}
                    messages={messages}
                    meId={me.id}
                />
                {ticket.status === "OPEN" ? (
                    <ContactReplyForm ticketId={ticket.id} />
                ) : (
                    <p style={{ marginTop: 16, color: "var(--muted, #6f7468)", fontStyle: "italic" }}>
                        This inquiry is resolved. Reopen it to reply again.
                    </p>
                )}
            </div>

            <form
                action={setContactStatus.bind(null, ticket.id, ticket.status === "OPEN" ? "HANDLED" : "OPEN")}
                style={{ marginTop: 16 }}
            >
                <button type="submit" className="cm-btn ghost">
                    {ticket.status === "OPEN" ? "Mark resolved" : "Reopen"}
                </button>
            </form>
        </div>
    );
}