// src/app/whole-foods/page.tsx
//
// The QR-code destination for the Whole Foods giveaway. Stands alone (outside
// the (site) group — no header/footer) so the only thing to do here is enter.
// New visitors create an account (IG + ZIP required → tagged local by ZIP);
// signed-in members just add their IG + ZIP. Print the QR as
// /whole-foods?src=qr so scans show up as their own row in analytics.
import type { Metadata } from "next";
import Link from "next/link";
import AuthForm from "@/components/AuthForm";
import PageTracker from "@/components/analytics/PageTracker";
import { localRegisterAction } from "@/app/(auth)/register/actions";
import { enterGiveawayAction } from "@/lib/actions/giveaway";
import { currentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatDay, getLocalConfig, giveawayStatus, IG_HANDLE } from "@/lib/local-markets";
import { CAMPAIGN, PARTNER, PRIZE, Tbd } from "./campaign";
import "./whole-foods.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: `${PARTNER} × vegan eating giveaway`,
    robots: { index: false }, // QR-only landing page
};

const ERRORS: Record<string, string> = {
    ig: "That Instagram handle doesn't look right — use just your @name.",
    zip: "Enter a 5-digit ZIP code.",
    igtaken: "That Instagram handle is already linked to another account. If it's yours, contact us.",
};

export default async function WholeFoodsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const sp = await searchParams;
    const [cfg, session] = await Promise.all([getLocalConfig(), currentUser()]);
    const g = cfg.giveaway;
    const status = giveawayStatus(g);
    const me = session?.id
        ? await prisma.user.findUnique({ where: { id: session.id }, select: { igHandle: true, zipCode: true, giveawayEnteredAt: true } })
        : null;

    return (
        <div className="wf">
            <PageTracker />
            <div className="wf-inner">
                <Link href="/" aria-label="vegan eating home">
                    <img src="/logo/logo-ink.svg" alt="vegan eating" width={150} height={38} className="wf-logo" />
                </Link>
                <div className="wf-kicker">{PARTNER} × vegan eating</div>
                <h1 className="wf-h1">Join us. <em>Win.</em></h1>
                <p className="wf-dek">
                    Create a free vegan eating account and follow us on Instagram for a chance to win <Tbd>{PRIZE}</Tbd>.
                </p>

                {status === "closed" ? (
                    <p className="wf-closed">
                        Entries closed {formatDay(g.end)} — the winner is drawn {formatDay(g.drawDate)}. You&rsquo;re still welcome to join!
                    </p>
                ) : status === "upcoming" ? (
                    <p className="wf-closed">Entries open {formatDay(g.start)}. You can create your account now.</p>
                ) : (
                    <span className="wf-date">Enter by {formatDay(g.end)} · Winner drawn {formatDay(g.drawDate)}</span>
                )}

                <ol className="wf-steps">
                    <li className={`wf-step ${me ? "is-done" : "is-now"}`}>
                        <span className="wf-num">{me ? "✓" : 1}</span>
                        <div><b>Create your free account</b><span>Takes under a minute.</span></div>
                    </li>
                    <li className={`wf-step ${me ? "is-done" : ""}`}>
                        <span className="wf-num">{me ? "✓" : 2}</span>
                        <div><b>Verify your email</b><span>Tap the link we send you.</span></div>
                    </li>
                    <li className={`wf-step ${me ? "is-now" : ""}`}>
                        <span className="wf-num">3</span>
                        <div><b>Follow @{IG_HANDLE}</b><span>We check this before announcing the winner.</span></div>
                    </li>
                </ol>

                {me ? (
                    <div className="wf-card">
                        <h2>{me.giveawayEnteredAt ? "You're entered" : "You're already a member"}</h2>
                        <p>
                            {me.giveawayEnteredAt
                                ? "Update your Instagram handle or ZIP below if anything changed."
                                : "Add your Instagram handle and ZIP to enter."}
                        </p>
                        {sp?.error && ERRORS[sp.error] ? <p className="wf-err">{ERRORS[sp.error]}</p> : null}
                        <form action={enterGiveawayAction}>
                            <label>
                                Instagram handle
                                <input name="igHandle" defaultValue={me.igHandle ?? ""} placeholder="@yourname" autoCapitalize="none" spellCheck={false} maxLength={60} required />
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
                        heading="Create your account"
                        subheading="Free, no spam. Includes our newsletter — one tested recipe each Sunday. Opt out anytime."
                    />
                )}

                <p className="wf-foot">
                    No purchase necessary. 18+. See the <Link href="/whole-foods/rules">official rules</Link>. This
                    promotion is not sponsored, endorsed or administered by, or associated with, Instagram.
                </p>
            </div>
        </div>
    );
}
