// src/app/submit/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth-helpers";
import SubmitRecipeForm from "@/components/SubmitRecipeForm";
import "./submit.css";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Submit a recipe — vegan eating" };

export default async function SubmitPage() {
    const user = await currentUser();

    return (
        <>
            <PageHero
                image="/header/submit2.jpg"
                kicker="The Community"
                title="Submit a recipe"
                dek="Cooked something worth sharing? Send it our way. We read every submission, test the
                        promising ones, and publish the keepers with credit to you."
            />


            <div className="wrap" style={{ paddingBottom: 70 }}>
                <section style={{ paddingTop: 28 }}>
                    {user ? (
                        <SubmitRecipeForm authorName={user.name ?? user.username ?? "you"} />
                    ) : (
                        <div className="tool-box submit-gate">
                            <span className="kicker">Members only</span>
                            <h2>You&rsquo;re not logged in</h2>
                            <p>
                                Submitting a recipe is for logged-in members, so we can credit you and follow up
                                with any questions. It&rsquo;s free and takes a minute.
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