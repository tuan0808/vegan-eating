// src/app/whole-foods/next/page.tsx — after entering: what's left to do.
// Reached from localRegisterAction (new account, `sc` = conversion id for the
// pixel SignUp twin) or enterGiveawayAction (existing member, `member=1`).
import type { Metadata } from "next";
import Link from "next/link";
import RedditEvent from "@/components/analytics/RedditEvent";
import { formatDay, getLocalConfig, IG_HANDLE, IG_URL } from "@/lib/local-markets";
import "../whole-foods.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "You're almost in — vegan eating", robots: { index: false } };

export default async function WholeFoodsNextPage({ searchParams }: { searchParams: Promise<{ sc?: string; member?: string }> }) {
    const sp = await searchParams;
    const member = sp?.member === "1";
    const g = (await getLocalConfig()).giveaway;

    return (
        <div className="wf">
            {sp?.sc && <RedditEvent event="SignUp" conversionId={sp.sc} />}
            <div className="wf-inner">
                <img src="/logo/logo-ink.svg" alt="vegan eating" width={150} height={38} className="wf-logo" />
                <div className="wf-kicker">{member ? "You're entered" : "Account created"}</div>
                <h1 className="wf-h1">One last <em>step.</em></h1>

                <ol className="wf-steps">
                    <li className="wf-step is-done">
                        <span className="wf-num">✓</span>
                        <div><b>Create your free account</b><span>Done — welcome to the table.</span></div>
                    </li>
                    <li className={`wf-step ${member ? "is-done" : "is-now"}`}>
                        <span className="wf-num">{member ? "✓" : 2}</span>
                        <div>
                            <b>Verify your email</b>
                            <span>{member ? "Done." : "Check your inbox (and spam) for our link — your entry counts once you've verified."}</span>
                        </div>
                    </li>
                    <li className={`wf-step ${member ? "is-now" : ""}`}>
                        <span className="wf-num">3</span>
                        <div><b>Follow @{IG_HANDLE} on Instagram</b><span>We check this before announcing the winner.</span></div>
                    </li>
                </ol>

                <a className="wf-ig" href={IG_URL} target="_blank" rel="noopener noreferrer">
                    Follow @{IG_HANDLE}
                </a>
                <p className="wf-note">
                    Winner drawn {formatDay(g.drawDate)}. {member ? <Link href="/dashboard">Go to your dashboard</Link> : <Link href="/login">Log in after verifying</Link>}
                </p>
                <p className="wf-foot"><Link href="/whole-foods/rules">Official rules</Link></p>
            </div>
        </div>
    );
}
