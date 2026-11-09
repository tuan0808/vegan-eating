// src/components/ForumMembersGate.tsx
// Shown in place of a members-only board's threads / a thread's posts when a
// logged-out visitor lands on it directly. Keeps the hero chrome, hides the
// content (e.g. promo codes), and points them to register / log in.
import Link from "next/link";
import PageHero from "@/components/PageHero";

export default function ForumMembersGate({
    categoryName,
    forumName = "Members only",
}: {
    categoryName: string;
    forumName?: string;
}) {
    return (
        <>
            <PageHero
                image="/header/forum.jpg"
                minHeight={380}
                breadcrumb={
                    <>
                        <Link href="/forum" style={{ color: "rgba(255,255,255,.85)" }}>Forums</Link>
                        <span style={{ margin: "0 8px" }}>/</span>
                        <span>{categoryName}</span>
                    </>
                }
                kicker={categoryName}
                title={forumName}
                dek="This board is for members. Create a free account to see what's inside."
            />
            <div className="forum-band">
                <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "44px 28px 90px" }}>
                    <p style={{ fontSize: 16, lineHeight: 1.6, color: "var(--muted,#6b7264)", margin: "0 0 20px", maxWidth: 560 }}>
                        Members-only board. Log in or create a free account to view its threads and
                        exclusive promo codes.
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <Link href="/register" className="btn-primary">Register for free</Link>
                        <Link href="/login" style={{ color: "var(--terra,#2f7d38)", fontWeight: 600, textDecoration: "none" }}>
                            Log in →
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
