// src/app/tools/veganize/page.tsx
import VeganizeTool from "@/components/VeganizeTool";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "Veganize any recipe — vegan eating",
    description: "Paste any recipe and get a fully plant-based version, powered by AI.",
};

export default function VeganizePage() {
    return (
        <>
            <PageHero
                image="/header/vegantool.jpg"
                kicker="AI tool"
                title="Veganize any recipe"
                dek="Paste a recipe — any recipe — and get a fully plant-based version with smart swaps and quantities. Needs your ANTHROPIC_API_KEY (see the README)"
            />

            <div className="wrap" style={{ paddingBottom: 70 }}>
                <section style={{ paddingTop: 28 }}>
                    <VeganizeTool />
                </section>
            </div>
        </>
    );
}