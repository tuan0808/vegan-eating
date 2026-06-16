// src/app/(site)/news/[slug]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Reuse the real article engine + chrome. (Worth moving these into @/components/article
// later so articles and news share them without cross-route imports.)
import ArticleBody from "@/app/(site)/articles/[slug]/ArticleBody";
import ShareButtons from "@/app/(site)/articles/[slug]/ShareButtons";
import NewsletterForm from "@/app/(site)/articles/[slug]/NewsletterForm";
import "@/app/(site)/articles/[slug]/article-content.css";

import { getNewsArticleBySlug, listRelatedNews, listLatestNews, type NewsCard } from "@/lib/news";
import { textToTiptap } from "@/lib/news-body";

export const revalidate = 3600;

export async function generateMetadata({
                                           params,
                                       }: {
    params: { slug: string };
}): Promise<Metadata> {
    const a = await getNewsArticleBySlug(params.slug);
    if (!a) return { title: "Story not found — vegan eating" };
    return { title: `${a.title} — vegan eating`, description: a.description || undefined };
}

// External news images come from arbitrary publisher hosts, so we use a plain
// <img> here rather than next/image (which would need every host whitelisted).
function NewsRail({ title, items }: { title: string; items: NewsCard[] }) {
    if (!items.length) return null;
    return (
        <div className="art-rail">
            <h4 className="art-rail-title">{title}</h4>
            <ul className="art-rail-list">
                {items.map((it) => (
                    <li key={it.slug}>
                        <Link href={`/news/${it.slug}`} className="art-rail-item">
              <span className="art-rail-thumb">
                {it.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={it.image}
                        alt=""
                        loading="lazy"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <span className="art-rail-ph" />
                )}
              </span>
                            <span className="art-rail-meta">
                <span className="art-rail-h">{it.title}</span>
                                {it.date ? <span className="art-rail-date">{it.date}</span> : null}
              </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default async function NewsArticlePage({ params }: { params: { slug: string } }) {
    const a = await getNewsArticleBySlug(params.slug);
    if (!a) notFound();

    const doc = textToTiptap(a.content || a.description);
    const kicker = a.categories[0] ?? "News";
    const dateLabel = a.pubDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const [related, latest] = await Promise.all([
        listRelatedNews(a.categories, a.slug, 4),
        listLatestNews(a.slug, 5),
    ]);

    return (
        <>
            {/* Hero — plain <img> so any publisher image host works without config. */}
            <section className="recipe-hero">
                <div className="hero-bg">
                    {a.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={a.image}
                            alt={a.title}
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    ) : (
                        <div className="ph p4" />
                    )}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(180deg, rgba(20,30,20,.40), rgba(20,30,20,.64))",
                        }}
                    />
                </div>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
          <span className="kicker" style={{ color: "#A7D98C", textTransform: "capitalize" }}>
            {kicker}
          </span>
                    <h1 style={{ fontSize: "clamp(34px,4.8vw,60px)", margin: "16px 0 14px", maxWidth: 820, lineHeight: 1.08 }}>
                        {a.title}
                    </h1>
                    <div className="hero-meta">
                        <span>{dateLabel}</span>
                        {a.source ? <span>via {a.source}</span> : null}
                    </div>
                </div>
            </section>

            <div className="wrap">
                <div className="recipe-body">
                    <aside>
                        <div className="art-aside">
                            <NewsletterForm />
                            <NewsRail title="Related News" items={related} />
                            <NewsRail title="Latest" items={latest} />
                        </div>
                    </aside>

                    <div>
                        <ArticleBody doc={doc} />

                        {/* Source credit + the link out for the full original. */}
                        <p style={{ margin: "10px 0 26px" }}>
                            <a
                                href={a.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: "inline-block",
                                    background: "var(--terra, #c2603a)",
                                    color: "#fff",
                                    padding: "12px 20px",
                                    borderRadius: "999px",
                                    textDecoration: "none",
                                    fontWeight: 600,
                                }}
                            >
                                Read the original at {a.source || "the source"} →
                            </a>
                        </p>

                        <hr className="art-sep" />

                        <div className="art-tagsbar">
                            <span className="art-tags-label">Topics</span>
                            {a.categories.length > 0 ? (
                                a.categories.map((t) => (
                                    <span key={t} className="art-tagchip" style={{ textTransform: "capitalize" }}>
                    {t}
                  </span>
                                ))
                            ) : (
                                <span className="art-tags-empty">No topics yet</span>
                            )}
                        </div>

                        <ShareButtons title={a.title} />

                        <div className="art-author">
                            <div className="art-author-avatar" />
                            <div className="art-author-main">
                                <h4 className="art-author-name">The vegan eating desk</h4>
                                <p className="art-author-bio">
                                    Plant-based news, curated and contextualised by the vegan eating team — no plugins, no ads,
                                    with the original source always one tap away.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}