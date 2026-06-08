// src/app/forum/page.tsx
import type { Metadata } from "next";
import { getForumIndex } from "@/lib/forum";
import ForumIndex from "@/components/ForumIndex";
import ForumAdminPanel from "@/components/ForumAdminPanel";


export const metadata: Metadata = {
    title: "Forums — vegan eating",
    description: "Join the conversation: recipes, guides, introductions, and more.",
};

// Statically rendered and refreshed in the background every 60s, so refreshes
// are instant instead of re-querying the DB on every request.
export const revalidate = 60;

export default async function ForumPage() {
    const categories = await getForumIndex();

    return (
        <>
            <section className="recipe-hero">
                <div className="hero-bg">
                    {/* Placeholder colour for now — swap this <div> for an <Image fill> later
              (and add `import Image from "next/image"`). The overlay keeps text legible either way. */}
                    <div className="ph p3" />
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(180deg, rgba(20,30,20,.35), rgba(20,30,20,.60))",
                        }}
                    />
                </div>
                <span className="hero-photo-note">Your hero photo here</span>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    <span className="kicker" style={{ color: "#A7D98C" }}>The community</span>
                    <h1 style={{ marginTop: 12, maxWidth: 760 }}>Forums</h1>
                    <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>
                        Swap recipes, ask questions, and meet other plant-based eaters. Be kind, read the rules, and dig in.
                    </p>
                </div>
            </section>

            <ForumIndex categories={categories} />
            <ForumAdminPanel />

        </>
    );
}