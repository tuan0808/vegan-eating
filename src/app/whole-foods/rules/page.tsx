// src/app/whole-foods/rules/page.tsx — official rules for the Whole Foods giveaway.
// A working draft: [highlighted] text is a placeholder to confirm (with the
// partner and, before launch, whoever reviews the legal wording). Dates come from
// Admin → Local signups so the rules and the form can't disagree.
import type { Metadata } from "next";
import Link from "next/link";
import { formatDay, getLocalConfig, IG_HANDLE, IG_URL } from "@/lib/local-markets";
import { CONTACT_EMAIL, PARTNER, PRIZE, PRIZE_VALUE, SPONSOR_ADDRESS, STORE, Tbd, WINNERS } from "../campaign";
import "../whole-foods.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Official rules — Whole Foods × vegan eating giveaway", robots: { index: false } };

function year(ymd: string) {
    return ymd.slice(0, 4);
}

export default async function WholeFoodsRulesPage() {
    const g = (await getLocalConfig()).giveaway;
    const start = `${formatDay(g.start)}, ${year(g.start)}`;
    const end = `${formatDay(g.end)}, ${year(g.end)}`;
    const draw = `${formatDay(g.drawDate)}, ${year(g.drawDate)}`;

    return (
        <div className="wf-rules">
            <header className="wf-rules-hero">
                <img src="/logo/logo-ink.svg" alt="vegan eating" width={150} height={38} className="wf-logo" />
                <div className="wf-kicker">{PARTNER} × vegan eating</div>
                <h1 className="wf-h1">Official <em>rules.</em></h1>
                <p className="wf-dek">Entries {start} – {end} · Winner drawn {draw}</p>
            </header>

            <main className="wf-rules-body">
                <p className="wf-rules-lead">
                    No purchase necessary to enter or win. A purchase will not increase your chances of winning. Void where
                    prohibited.
                </p>

                <h2>1. Sponsor</h2>
                <p>
                    The giveaway (the &ldquo;Promotion&rdquo;) is sponsored by vegan eating (veganeating.com),{" "}
                    <Tbd>{SPONSOR_ADDRESS}</Tbd> (&ldquo;Sponsor&rdquo;).{" "}
                    <Tbd>[Confirm Whole Foods Market&rsquo;s role — co-sponsor, prize provider, or venue only — and that they approve the use of their name.]</Tbd>
                </p>
                <p>
                    This Promotion is in no way sponsored, endorsed or administered by, or associated with, Instagram or
                    Meta Platforms, Inc. By entering, you release Instagram and Meta from any and all liability related
                    to this Promotion.
                </p>

                <h2>2. Eligibility</h2>
                <p>
                    Open to legal residents of the United States who are 18 years of age or older at the time of entry{" "}
                    <Tbd>[and who reside in Florida / Palm Beach County — decide whether non-local entrants can win]</Tbd>.
                    Employees of Sponsor <Tbd>[and of Whole Foods Market]</Tbd>, and their immediate family and household
                    members, are not eligible.
                </p>

                <h2>3. Entry period</h2>
                <p>
                    The Promotion begins {start} and ends at 11:59 p.m. Eastern Time on {end} (the &ldquo;Entry
                    Period&rdquo;). Entries made after the Entry Period ends are not eligible.
                </p>

                <h2>4. How to enter</h2>
                <ol>
                    <li>
                        Create a free vegan eating account at <Link href="/whole-foods">veganeating.com/whole-foods</Link>{" "}
                        (for example by scanning the QR code at <Tbd>{STORE}</Tbd>), giving your username, email address,
                        Instagram handle and ZIP code. Existing members can enter on the same page by adding their
                        Instagram handle and ZIP code.
                    </li>
                    <li>Verify your email address using the link we send you.</li>
                    <li>
                        Follow <a href={IG_URL} target="_blank" rel="noopener noreferrer">@{IG_HANDLE}</a> on Instagram, and
                        keep following until the winner is confirmed.
                    </li>
                </ol>
                <p>
                    Limit one entry per person and per email address. Entries made with multiple or automated accounts
                    will be disqualified. Creating an account also subscribes you to the vegan eating newsletter; you can
                    opt out at any time in your account settings without affecting your entry.
                </p>

                <h2>5. Prize</h2>
                <p>
                    <Tbd>{WINNERS}</Tbd> winner(s) will receive <Tbd>{PRIZE}</Tbd>. <Tbd>{PRIZE_VALUE}</Tbd>. The prize is
                    non-transferable and no cash substitute is offered, except that Sponsor may substitute a prize of
                    equal or greater value. <Tbd>[How the prize is delivered or picked up.]</Tbd> Any taxes are the
                    winner&rsquo;s responsibility.
                </p>

                <h2>6. Winner selection &amp; notification</h2>
                <p>
                    On or about {draw}, Sponsor will randomly select a potential winner from all eligible entries received
                    during the Entry Period. Odds of winning depend on the number of eligible entries. Sponsor will then
                    confirm that the potential winner has a verified vegan eating account and follows @{IG_HANDLE} on
                    Instagram. If not, another entry will be drawn.
                </p>
                <p>
                    The potential winner will be notified by email <Tbd>[and/or Instagram direct message]</Tbd> and must
                    respond within <Tbd>[7]</Tbd> days, or an alternate winner may be drawn. Sponsor will never ask for
                    payment, bank details or passwords to claim a prize.
                </p>

                <h2>7. Publicity</h2>
                <p>
                    Except where prohibited, accepting the prize means the winner agrees that Sponsor may use their
                    username, first name and city for promotional purposes without further compensation{" "}
                    <Tbd>[confirm whether you want this]</Tbd>.
                </p>

                <h2>8. Privacy</h2>
                <p>
                    Information you give us is used to run this Promotion and your vegan eating account, as described in
                    our <Tbd>[privacy policy link]</Tbd>. Your ZIP code tells us whether you&rsquo;re local to our Boca
                    Raton home base. We do not sell your information.
                </p>

                <h2>9. General conditions</h2>
                <p>
                    Sponsor may disqualify anyone who tampers with the entry process or breaks these rules, and may cancel
                    or modify the Promotion if fraud, technical failure or anything else outside Sponsor&rsquo;s control
                    affects its fairness. By entering, you release Sponsor <Tbd>[and Whole Foods Market]</Tbd> from
                    liability for any injury or loss related to the Promotion or prize. This Promotion is governed by the
                    laws of the State of Florida. <Tbd>[If the total prize value is over $5,000, Florida requires the
                    Promotion to be registered and bonded with the Department of Agriculture and Consumer Services at
                    least 7 days before it starts.]</Tbd>
                </p>

                <h2>10. Winner list &amp; questions</h2>
                <p>
                    For the winner&rsquo;s name (available after {draw}) or any questions, email{" "}
                    <Tbd>{CONTACT_EMAIL}</Tbd>.
                </p>

                <Link href="/whole-foods" className="wf-rules-back">← Back to the giveaway</Link>
            </main>
        </div>
    );
}
