// src/app/tools/veganize/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import VeganizeTool from "@/components/VeganizeTool";
import PageHero from "@/components/PageHero";
import { currentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { checkEligibility } from "@/lib/veganize";
import "@/app/(site)/submit/submit.css"; // reuse the .submit-gate card styling

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "Veganize any recipe — vegan eating",
    description:
        "Paste any recipe and get a fully plant-based version, with smart swaps and the reasoning behind every change.",
};

export default async function VeganizePage() {
    const sessionUser = await currentUser();

    const record = sessionUser
        ? await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { emailVerified: true, banned: true, createdAt: true },
        })
        : null;
    const elig = record ? await checkEligibility(record) : null;

    return (
        <>
            <PageHero
                image="/header/vegantool.jpg"
                kicker="AI tool"
                title="Veganize any recipe"
                dek="Paste a recipe — any recipe — and our kitchen assistant suggests vegan swaps, a rewritten
                        method, and the reasoning behind every change."
            />

            <div className="wrap" style={{ paddingBottom: 70 }}>
                <section style={{ paddingTop: 28 }}>
                    {!sessionUser ? (
                        <div className="tool-box submit-gate">
                            <span className="kicker">Members only</span>
                            <h2>You&rsquo;re not logged in</h2>
                            <p>
                                The veganizer is a members-only tool — that&rsquo;s how we keep the kitchen
                                assistant free of spam and abuse. It&rsquo;s free to join and takes a minute.
                            </p>
                            <div className="submit-gate-actions">
                                <Link href="/login" className="btn-primary">Log in</Link>
                                <Link href="/register" className="btn-ghost">Create an account</Link>
                            </div>
                        </div>
                    ) : elig && !elig.ok ? (
                        <div className="tool-box submit-gate">
                            <span className="kicker">Almost there</span>
                            <h2>Not quite ready</h2>
                            <p>{elig.reason}</p>
                            <div className="submit-gate-actions">
                                <Link href="/dashboard" className="btn-primary">Back to dashboard</Link>
                            </div>
                        </div>
                    ) : (
                        <VeganizeTool />
                    )}
                </section>
            </div>
        </>
    );
}