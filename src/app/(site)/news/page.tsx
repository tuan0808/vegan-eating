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

// Linked image with a graceful placeholder when a story has no photo.
function Media({ item, className }: { item: NewsFeedItem; className: string }) {
    return (
        <Link href={`/news/${item.slug}`} className={className} aria-label={item.title}>
            {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.title} loading="lazy" />
            ) : (
                <span className="ph p3" aria-hidden="true" />
            )}
        </Link>
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
                            <Media item={lead} className="nws-lead-media" />
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
                                        <Media item={s} className="nws-card-media" />
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
                                            <Link href={`/news/${b.slug}`} className="nws-brief-thumb" aria-label={b.title}>
                                                {b.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={b.image} alt={b.title} loading="lazy" />
                                                ) : (
                                                    <span className="ph p3" aria-hidden="true" />
                                                )}
                                            </Link>
                                            <div className="nws-brief-text">
                                                <Link className="nws-link nws-brief-link" href={`/news/${b.slug}`}>
                                                    {b.title}
                                                </Link>
                                                <span className="nws-brief-meta">
                          {b.dateShort}
                                                    {b.source ? ` · ${b.source}` : ""}
                        </span>
                                            </div>
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