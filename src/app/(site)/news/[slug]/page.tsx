// src/app/(site)/news/[slug]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Reuse the real article engine + chrome. (Worth moving these into @/components/article
// later so articles and news share them without cross-route imports.)
import ArticleBody from "@/app/(site)/articles/[slug]/ArticleBody";
import NewsletterForm from "@/app/(site)/articles/[slug]/NewsletterForm";
import "@/app/(site)/articles/[slug]/article-content.css";

import PostFooter from "@/components/post/PostFooter";
import { getNewsArticleBySlug, listRelatedNews, listLatestNews, type NewsCard } from "@/lib/news";
import { textToTiptap } from "@/lib/news-body";
import { pageMetadata, toISO, breadcrumbJsonLdScript } from "@/lib/seo";
import { newsJsonLdScript } from "@/lib/news-jsonld";

// ISR: curated stories are stored in the DB and served statically, revalidated
// hourly. No cookies/searchParams here, so the route stays cacheable.
// (On hide/sync, call revalidatePath(`/news/${slug}`) to refresh immediately.)
export const revalidate = 3600;

export async function generateMetadata({
                                           params,
                                       }: {
    params: { slug: string };
}): Promise<Metadata> {
    const a = await getNewsArticleBySlug(params.slug);
    if (!a) return { title: "Story not found", robots: { index: false, follow: false } };
    return pageMetadata({
        title: a.title,
        description: a.description || undefined,
        path: `/news/${a.slug}`,
        type: "article",
        publishedTime: toISO(a.pubDate),
    });
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

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

    // schema.org/NewsArticle JSON-LD — same shape as recipes/articles.
    const newsJsonLd = newsJsonLdScript(a, {
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://veganeating.com",
        mediaBaseUrl: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
    });
    const breadcrumbJsonLd = breadcrumbJsonLdScript([
        { name: "News", path: "/news" },
        { name: a.title, path: `/news/${a.slug}` },
    ]);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: newsJsonLd }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
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
                                Read the original at {a.source || "the source"} &rarr;
                            </a>
                        </p>

                        {/* Shared footer — same stack as recipes & articles. Comments are
                            omitted until the Comment model gains a newsArticleId relation. */}
                        <PostFooter
                            tags={a.categories.map(cap)}
                            shareTitle={a.title}
                            shareNoun="story"
                            related={related}
                            more={latest}
                            basePath="/news"
                            otherTitle="More stories"
                            relatedLabel="Related"
                            moreLabel="Latest"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}