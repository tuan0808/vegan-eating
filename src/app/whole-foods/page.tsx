// src/app/whole-foods/page.tsx
//
// The QR-code destination for the Whole Foods giveaway. Wears the normal site
// chrome (header, PageHero, footer) like /recipes so it feels part of the site.
// New visitors create an account (ZIP required → tagged local by ZIP; IG optional);
// signed-in members just add their ZIP + optional IG. Print the QR as
// /whole-foods?src=qr so scans show up as their own row in analytics.
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import PageTracker from "@/components/analytics/PageTracker";
import PageHero from "@/components/PageHero";
import Header from "@/components/Header";
import ClientEffects from "@/components/ClientEffects";
import { Footer } from "@/components/Sections";
import { localRegisterAction } from "@/app/(auth)/register/actions";
import { enterGiveawayAction } from "@/lib/actions/giveaway";
import { currentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatDay, getLocalConfig, giveawayStatus } from "@/lib/local-markets";
import { getGiveawayContent, giveawayVars } from "@/lib/giveaway-content";
import { CAMPAIGN, Copy, copyText } from "./campaign";
import "./whole-foods.css";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
    const c = await getGiveawayContent();
    return {
        title: `${c.partner} × vegan eating giveaway`,
        robots: { index: false }, // QR-only landing page
    };
}

const ERRORS: Record<string, string> = {
    ig: "That Instagram handle doesn't look right — use just your @name.",
    zip: "Enter a 5-digit ZIP code.",
    igtaken: "That Instagram handle is already linked to another account. If it's yours, contact us.",
};

export default async function WholeFoodsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const sp = await searchParams;
    const [cfg, c, session] = await Promise.all([getLocalConfig(), getGiveawayContent(), currentUser()]);
    const g = cfg.giveaway;
    const vars = giveawayVars(c, g);
    const status = giveawayStatus(g);
    const me = session?.id
        ? await prisma.user.findUnique({ where: { id: session.id }, select: { igHandle: true, zipCode: true, giveawayEnteredAt: true } })
        : null;

    return (
        <>
            <PageTracker />
            <Header />
            <ClientEffects />
            <main className="wf-main">
                <PageHero
                    image="/header/whole-foods-header.png"
                mobileImage="/header/whole-foods-header-mobile.png"
                    className="wf-hero"
                    kicker={`${c.partner} × vegan eating`}
                    title={<Copy text={c.headline} vars={vars} />}
                    dek={<Copy text={c.dek} vars={vars} />}
                >
                    {status === "closed" ? (
                        <p className="wf-closed">
                            Entries closed {formatDay(g.end)} — the winner is drawn {formatDay(g.drawDate)}. You&rsquo;re still welcome to join!
                        </p>
                    ) : status === "upcoming" ? (
                        <p className="wf-closed">Entries open {formatDay(g.start)}. You can create your account now.</p>
                    ) : (
                        <span className="wf-date">Enter by {formatDay(g.end)} · Winner drawn {formatDay(g.drawDate)}</span>
                    )}
                </PageHero>

                <div className="wf">
                    <div className="wf-inner">
                        <ol className="wf-steps">
                            <li className={`wf-step ${me ? "is-done" : "is-now"}`}>
                                <span className="wf-num">{me ? "✓" : 1}</span>
                                <div><b><Copy text={c.steps[0].title} vars={vars} /></b><span><Copy text={c.steps[0].text} vars={vars} /></span></div>
                            </li>
                            <li className={`wf-step ${me ? "is-done" : ""}`}>
                                <span className="wf-num">{me ? "✓" : 2}</span>
                                <div><b><Copy text={c.steps[1].title} vars={vars} /></b><span><Copy text={c.steps[1].text} vars={vars} /></span></div>
                            </li>
                            <li className={`wf-step ${me ? "is-now" : ""}`}>
                                <span className="wf-num">3</span>
                                <div><b><Copy text={c.steps[2].title} vars={vars} /></b><span><Copy text={c.steps[2].text} vars={vars} /></span></div>
                            </li>
                        </ol>

                        {me ? (
                            <div className="wf-card">
                                <h2>{me.giveawayEnteredAt ? "You're entered" : "You're already a member"}</h2>
                                <p>
                                    {me.giveawayEnteredAt
                                        ? "Update your ZIP or Instagram handle below if anything changed."
                                        : "Add your ZIP to enter."}
                                </p>
                                {sp?.error && ERRORS[sp.error] ? <p className="wf-err">{ERRORS[sp.error]}</p> : null}
                                <form action={enterGiveawayAction}>
                                    <label>
                                        Instagram handle (optional)
                                        <input name="igHandle" defaultValue={me.igHandle ?? ""} placeholder="@yourname" autoCapitalize="none" spellCheck={false} maxLength={60} />
                                    </label>
                                    <label>
                                        ZIP code
                                        <input name="zipCode" defaultValue={me.zipCode ?? ""} inputMode="numeric" autoComplete="postal-code" pattern="\d{5}(-\d{4})?" maxLength={10} required />
                                    </label>
                                    <button type="submit">{me.giveawayEnteredAt ? "Save" : "Enter the giveaway"}</button>
                                </form>
                            </div>
                        ) : (
                            <AuthForm
                                mode="register"
                                action={localRegisterAction}
                                error={sp?.error}
                                local={{ campaign: CAMPAIGN }}
                                next="/whole-foods"
                                heading={copyText(c.formHeading, vars)}
                                subheading={copyText(c.formSubheading, vars)}
                            />
                        )}

                        <p className="wf-foot"><Copy text={c.footer} vars={vars} /></p>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
