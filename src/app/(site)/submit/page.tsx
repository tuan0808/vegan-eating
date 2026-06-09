// src/app/submit/page.tsx
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Submit a recipe — vegan eating" };

export default function SubmitPage() {
    return (
        <>
            <PageHero
                image="/header/submit2.jpg"
                kicker="Contribute"
                title="Submit a Recipe"
                dek="Share your favorite plant-based dish with the community."
                minHeight={380}
            />

            <div className="wrap" style={{ paddingBottom: 60 }}>
                <section style={{ paddingTop: 28 }}>
                    <div className="tool-box">
                        <form action="#" style={{ display: "grid", gap: 16 }}>
                            <label style={{ fontWeight: 600 }}>Recipe title
                                <input style={{ width: "100%", marginTop: 6, padding: 14, borderRadius: 12, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 15 }} placeholder="e.g. Smoky tofu tacos" />
                            </label>
                            <label style={{ fontWeight: 600 }}>Ingredients (one per line)
                                <textarea style={{ marginTop: 6 }} placeholder={"1 block firm tofu\n2 tbsp soy sauce\n..."} />
                            </label>
                            <label style={{ fontWeight: 600 }}>Method (one step per line)
                                <textarea style={{ marginTop: 6 }} placeholder={"Press the tofu...\nFry until golden...\n..."} />
                            </label>
                            <button type="button" className="btn-primary" style={{ justifyContent: "center" }}>Save as draft (wiring up next)</button>
                        </form>
                    </div>
                </section>
            </div>
        </>
    );
}