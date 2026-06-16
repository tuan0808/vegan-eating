// src/app/(site)/news/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import "./news.css";
import PageHero from "@/components/PageHero";
import { getNewsFeed, type NewsFeedItem } from "@/lib/news";

export const revalidate = 3600;

export const metadata: Metadata = {
    title: "The Dispatch — news & notes — vegan eating",
    description:
        "The latest vegan and vegetarian stories in food, health, and lifestyle — gathered from around the web.",
};

function Source({ name }: { name: string }) {
    return (
        <span className="nws-kind" data-kind="Industry">
      {name || "News"}
    </span>
    );
}

function Headline({ item, tag }: { item: NewsFeedItem; tag: "h2" | "h3" }) {
    const Tag = tag;
    const cls = tag === "h2" ? "nws-lead-title" : "nws-story-title";
    return (
        <Tag className={cls}>
            <Link className="nws-link" href={`/news/${item.slug}`}>
                {item.title}
            </Link>
        </Tag>
    );
}

export default async function NewsPage() {
    const items = await getNewsFeed(10);
    const lead = items[0];
    const stories = items.slice(1, 4);
    const brief = items.slice(4, 10);

    return (
        <>
            <PageHero
                image="/header/news3.jpg"
                kicker="vegan eating · news & notes"
                title="The Dispatch"
                dek="The latest vegan and vegetarian stories in food, health, and lifestyle — gathered from around the web."
            />

            <div className="nws-wrap nws-body">
                {!lead ? (
                    <p style={{ color: "var(--muted)", padding: "24px 0" }}>
                        No stories yet — they&apos;ll appear here as the feed syncs.
                    </p>
                ) : (
                    <>
                        {/* Lead story */}
                        <article className="nws-lead">
                            <div className="nws-lead-media">
                                {lead.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={lead.image}
                                        alt={lead.title}
                                        loading="lazy"
                                        style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
                                    />
                                ) : (
                                    <>
                                        <div className="ph p3" />
                                        <span className="nws-media-note">Photo to come</span>
                                    </>
                                )}
                            </div>
                            <div className="nws-lead-text">
                                <Source name={lead.source} />
                                <Headline item={lead} tag="h2" />
                                {lead.description ? <p className="nws-lead-dek">{lead.description}</p> : null}
                                <p className="nws-byline">
                                    {lead.source ? `${lead.source} · ` : ""}
                                    {lead.date}
                                </p>
                            </div>
                        </article>

                        <hr className="nws-rule" />

                        <div className="nws-grid">
                            <section className="nws-cols">
                                {stories.map((s) => (
                                    <article className="nws-story" key={s.slug}>
                                        <Source name={s.source} />
                                        <Headline item={s} tag="h3" />
                                        {s.description ? <p className="nws-story-dek">{s.description}</p> : null}
                                        <p className="nws-byline">{s.date}</p>
                                    </article>
                                ))}
                            </section>

                            <aside className="nws-brief">
                                <h3 className="nws-brief-head">In brief</h3>
                                <ul>
                                    {brief.map((b) => (
                                        <li className="nws-brief-item" key={b.slug}>
                                            <span className="nws-brief-date">{b.dateShort}</span>
                                            <Link className="nws-link" href={`/news/${b.slug}`}>
                                                {b.title}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <p className="nws-brief-foot">Updated hourly from across the web.</p>
                            </aside>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}