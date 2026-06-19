// src/app/submit/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import SubmitRecipeForm, { type SubmitInitial } from "@/components/SubmitRecipeForm";
import "./submit.css";
import PageHero from "@/components/PageHero";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Submit a recipe — vegan eating" };

export default async function SubmitPage({
                                             searchParams,
                                         }: {
    searchParams: { from?: string };
}) {
    const user = await currentUser();

    // "Save & test" from the veganizer arrives as ?from=<veganizeRequestId>.
    // Load it (only if it belongs to this member) and pre-fill the form.
    let initial: SubmitInitial | undefined;
    if (user && searchParams?.from) {
        const req = await prisma.veganizeRequest.findFirst({
            where: { id: searchParams.from, userId: user.id },
            select: { id: true, output: true },
        });
        if (req) {
            try {
                const r = JSON.parse(req.output);
                initial = {
                    fromId: req.id,
                    title: String(r?.title ?? ""),
                    ingredients: Array.isArray(r?.ingredients) ? r.ingredients.join("\n") : "",
                    method: Array.isArray(r?.method) ? r.method.join("\n") : "",
                    prepMin: r?.times?.prepMin ? String(r.times.prepMin) : "",
                    cookMin: r?.times?.cookMin ? String(r.times.cookMin) : "",
                    readyMin: r?.times?.readyMin ? String(r.times.readyMin) : "",
                };
            } catch {
                /* unreadable cache — fall back to a blank form */
            }
        }
    }

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
                        <SubmitRecipeForm
                            authorName={user.name ?? user.username ?? "you"}
                            initial={initial}
                        />
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