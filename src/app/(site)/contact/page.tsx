// src/app/(site)/contact/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import ContactForm from "@/components/ContactForm";
import PageHero from "@/components/PageHero";
// Reuse the submit page's form/card styling so the two pages feel identical.
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
                <section style={{ paddingTop: 28, display: "flex", justifyContent: "center" }}>
                    {user ? (
                        <ContactForm defaultName={defaultName} />
                    ) : (
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
                    )}
                </section>
            </div>
        </>
    );
}