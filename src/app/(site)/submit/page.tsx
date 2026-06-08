// src/app/submit/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Submit a recipe — vegan eating" };

export default function SubmitPage() {
    return (
        <>
            <section className="recipe-hero">
                <div className="hero-bg">
                    {/* Placeholder colour for now — swap this <div> for an <Image fill> later. */}
                    <div className="ph p5" />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,30,20,.35), rgba(20,30,20,.60))" }} />
                </div>
                <span className="hero-photo-note">Your hero photo here</span>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    <span className="kicker" style={{ color: "#A7D98C" }}>In progress</span>
                    <h1 style={{ marginTop: 12, maxWidth: 760 }}>Submit a recipe</h1>
                    <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>
                        Contributors and staff will add recipes through a proper dashboard (a headless CMS) with structured fields, draft/review/publish, and a &ldquo;tested by&rdquo; record. This is a preview of the fields.
                    </p>
                </div>
            </section>

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