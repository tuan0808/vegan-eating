// src/app/news/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import "./news.css";

export const metadata: Metadata = {
    title: "The Dispatch — news & notes — vegan eating",
    description: "Dispatches from the vegan eating kitchen: new recipes, community news, and what we're building next.",
};

type Kind = "Kitchen" | "Community" | "Industry" | "Notebook";
type Item = { kind: Kind; title: string; dek?: string; date: string; author?: string; href?: string };

const EDITION = { no: "No. 1", date: "Sunday, June 7, 2026", line: "Filed from the kitchen" };

const lead: Item = {
    kind: "Kitchen",
    title: "We re-tested every dessert in the archive — here's what actually changed",
    dek: "Three months, one tired oven, and rather too much aquafaba. The short version: nine recipes got better, two got quietly binned, and we finally cracked a chewy cookie that doesn't need a special flour.",
    date: "June 5, 2026",
    author: "The kitchen desk",
    href: "/recipes?cat=desserts",
};

const stories: Item[] = [
    { kind: "Community", title: "The forum quietly passed 5,000 cooks this week", dek: "Most-shared thread of the month: a fourteen-reply deep-dive on getting tofu genuinely crisp without a deep fryer.", date: "June 4, 2026", href: "/forum" },
    { kind: "Industry", title: "Oat milk is now the default at one café in three, a new survey finds", dek: "Dairy is increasingly the thing you ask for, not the thing you're handed. We read the report so you don't have to.", date: "June 2, 2026" },
    { kind: "Notebook", title: "What we're building next: ratings first, then a weekly meal planner", dek: "A peek at the roadmap — accounts, star ratings, saved shopping lists, and a planner that fills your week straight from the archive.", date: "May 30, 2026" },
];

const brief: Item[] = [
    { kind: "Kitchen", title: "Twelve new recipes landed in the Baking index.", date: "Jun 6", href: "/recipes?cat=baking" },
    { kind: "Notebook", title: "The Veganizer now handles baking ratios, not just swaps.", date: "Jun 5", href: "/tools/veganize" },
    { kind: "Community", title: "Reader tip of the week: a spoonful of miso in your caramel.", date: "Jun 3", href: "/forum" },
    { kind: "Notebook", title: "We're after a few volunteer recipe testers.", date: "Jun 1", href: "/submit" },
    { kind: "Kitchen", title: "Asparagus is in — nine ways to use the whole spear.", date: "May 28", href: "/recipes" },
];

function Kind({ k }: { k: Kind }) {
    return <span className="nws-kind" data-kind={k}>{k}</span>;
}

function Headline({ item, tag }: { item: Item; tag: "h2" | "h3" }) {
    const Tag = tag;
    const cls = tag === "h2" ? "nws-lead-title" : "nws-story-title";
    return (
        <Tag className={cls}>
            {item.href ? <Link href={item.href} className="nws-link">{item.title}</Link> : item.title}
        </Tag>
    );
}

export default function NewsPage() {
    return (
        <>
            <div className="nws-plate">
                <div className="nws-wrap">
                    <p className="nws-eyebrow">vegan eating · news &amp; notes</p>
                    <h1 className="nws-nameplate">The Dispatch</h1>
                    <div className="nws-dateline">
                        <span>{EDITION.no}</span>
                        <span className="nws-dateline-mid">{EDITION.date}</span>
                        <span>{EDITION.line}</span>
                    </div>
                </div>
            </div>

            <div className="nws-wrap nws-body">
                {/* Lead story */}
                <article className="nws-lead">
                    <div className="nws-lead-media">
                        <div className="ph p3" />
                        <span className="nws-media-note">Photo to come</span>
                    </div>
                    <div className="nws-lead-text">
                        <Kind k={lead.kind} />
                        <Headline item={lead} tag="h2" />
                        <p className="nws-lead-dek">{lead.dek}</p>
                        <p className="nws-byline">{lead.author} · {lead.date}</p>
                    </div>
                </article>

                <hr className="nws-rule" />

                <div className="nws-grid">
                    <section className="nws-cols">
                        {stories.map((s) => (
                            <article className="nws-story" key={s.title}>
                                <Kind k={s.kind} />
                                <Headline item={s} tag="h3" />
                                {s.dek ? <p className="nws-story-dek">{s.dek}</p> : null}
                                <p className="nws-byline">{s.date}</p>
                            </article>
                        ))}
                    </section>

                    <aside className="nws-brief">
                        <h3 className="nws-brief-head">In brief</h3>
                        <ul>
                            {brief.map((b) => (
                                <li className="nws-brief-item" key={b.title}>
                                    <span className="nws-brief-date">{b.date}</span>
                                    {b.href ? <Link href={b.href} className="nws-link">{b.title}</Link> : b.title}
                                </li>
                            ))}
                        </ul>
                        <p className="nws-brief-foot">More dispatches soon — this desk is just getting started.</p>
                    </aside>
                </div>
            </div>
        </>
    );
}