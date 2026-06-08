// src/app/tools/veganize/page.tsx
import VeganizeTool from "@/components/VeganizeTool";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Veganize any recipe — vegan eating",
    description: "Paste any recipe and get a fully plant-based version, powered by AI.",
};

export default function VeganizePage() {
    return (
        <>
            <section className="recipe-hero">
                <div className="hero-bg">
                    {/* Placeholder colour for now — swap this <div> for an <Image fill> later. */}
                    <div className="ph p2" />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,30,20,.35), rgba(20,30,20,.60))" }} />
                </div>
                <span className="hero-photo-note">Your hero photo here</span>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    <span className="kicker" style={{ color: "#A7D98C" }}>AI tool</span>
                    <h1 style={{ marginTop: 12, maxWidth: 760 }}>Veganize any recipe</h1>
                    <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>
                        Paste a recipe — any recipe — and get a fully plant-based version with smart swaps and quantities. Needs your ANTHROPIC_API_KEY (see the README).
                    </p>
                </div>
            </section>

            <div className="wrap" style={{ paddingBottom: 70 }}>
                <section style={{ paddingTop: 28 }}>
                    <VeganizeTool />
                </section>
            </div>
        </>
    );
}