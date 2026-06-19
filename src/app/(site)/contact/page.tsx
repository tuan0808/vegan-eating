// src/app/(site)/contact/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import ContactForm from "@/components/ContactForm";
import ContactThread from "@/components/ContactThread";
import ContactReplyForm from "@/components/ContactReplyForm";
import PageHero from "@/components/PageHero";
import { openTicketForUser, threadMessages } from "@/lib/contact";
import "@/app/(site)/submit/submit.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "Contact — vegan eating",
    description: "A question, a site issue, or a recipe request — get in touch with the vegan eating team.",
};

export default async function ContactPage() {
    const user = await currentUser();
    const record = user
        ? await prisma.user.findUnique({
            where: { id: user.id },
            select: { name: true, username: true },
        })
        : null;
    const defaultName = record?.name ?? record?.username ?? "";

    // One open ticket at a time — show its conversation instead of a new form.
    const openTicket = user ? await openTicketForUser(user.id) : null;

    return (
        <>
            <PageHero
                image="/header/about.jpg"
                kicker="Contact"
                title="Get in touch"
                dek="A question, a site issue, or a recipe you'd love to see — send it our way and we'll
                        get back to you."
            />

            <div className="wrap" style={{ paddingBottom: 70 }}>
                <section style={{ paddingTop: 28 }}>
                    {!user ? (
                        <div className="tool-box submit-gate">
                            <span className="kicker">Members only</span>
                            <h2>You&rsquo;re not logged in</h2>
                            <p>
                                Sending us a message is for logged-in members, so we can reply and keep the
                                inbox spam-free. It&rsquo;s free and takes a minute.
                            </p>
                            <div className="submit-gate-actions">
                                <Link href="/login" className="btn-primary">Log in</Link>
                                <Link href="/register" className="btn-ghost">Create an account</Link>
                            </div>
                        </div>
                    ) : openTicket ? (
                        <div className="tool-box">
                            <ContactThread
                                category={openTicket.category}
                                status={openTicket.status}
                                messages={threadMessages(openTicket)}
                                meId={user.id}
                            />
                            <ContactReplyForm ticketId={openTicket.id} />
                            <p style={{ marginTop: 14, fontSize: 13, color: "var(--muted, #6f7468)" }}>
                                One inquiry at a time — you can start a new one once this is resolved.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p style={{ margin: "0 0 16px", color: "var(--muted, #6f7468)", lineHeight: 1.6 }}>
                                Sending as <strong>{defaultName || "your account"}</strong>. Pick a topic and
                                we&rsquo;ll route it to the right people.
                            </p>
                            <ContactForm defaultName={defaultName} />
                        </>
                    )}
                </section>
            </div>
        </>
    );
}