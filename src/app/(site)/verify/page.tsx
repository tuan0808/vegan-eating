// src/app/(site)/verify/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { consumeVerificationToken } from "@/lib/verification";
import PageHero from "@/components/PageHero";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify email — vegan eating", robots: { index: false, follow: false } };

export default async function VerifyPage({
    searchParams,
}: {
    searchParams?: Promise<{ token?: string }>;
}) {
    const sp = await searchParams;
    const token = sp?.token;
    const outcome = token ? await consumeVerificationToken(token) : { status: "invalid" as const, name: null };

    const ok = outcome.status === "ok";
    const heroTitle = ok
        ? `Welcome${outcome.name ? `, ${outcome.name}` : ""}`
        : outcome.status === "expired"
            ? "Link expired"
            : "Invalid link";

    const heroDek = ok
        ? "Your email is confirmed."
        : outcome.status === "expired"
            ? "That verification link has expired."
            : "We couldn’t verify this link.";

    return (
        <>
            <PageHero
                image="/header/about.jpg"
                kicker="vegan eating"
                title={heroTitle}
                dek={heroDek}
            />

            <div className="wrap">
                <section style={{ maxWidth: 620, margin: "0 auto", padding: "48px 0 72px" }}>
                    {ok ? (
                        <>
                            <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--ink, #1c2a1a)", margin: 0 }}>
                                You&rsquo;re all set — your account is verified. Sign in to save recipes, rate what you
                                cook, and join the conversation in the forums.
                            </p>
                            <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--muted, #5f6a57)", marginTop: 14 }}>
                                One last thing: to post in the forums, read the house rules once at{" "}
                                <Link href="/forum/general/news" style={{ color: "var(--terra, #2f7d38)", fontWeight: 600 }}>
                                    the rules thread
                                </Link>{" "}
                                and posting unlocks.
                            </p>
                        </>
                    ) : (
                        <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--ink, #1c2a1a)", margin: 0 }}>
                            {outcome.status === "expired"
                                ? "Sign in and request a fresh verification link from there."
                                : "It may have already been used. Try signing in — if your email is already verified, you’re good to go."}
                        </p>
                    )}

                    <p style={{ marginTop: 30 }}>
                        <Link href="/login" className="btn-primary">
                            Go to sign in
                        </Link>
                    </p>
                </section>
            </div>
        </>
    );
}
