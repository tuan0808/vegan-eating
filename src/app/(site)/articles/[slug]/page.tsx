// src/app/articles/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { getArticleBySlug, listRelatedArticles, listPopularArticles, listRecentArticles } from "@/lib/articles";
import type { Article } from "@/data/articles";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReadingProgress from "@/components/ReadingProgress";
import HeroTitle from "@/components/HeroTitle";
import ShareButtons from "./ShareButtons";
import OtherPosts from "./OtherPosts";
import NewsletterForm from "./NewsletterForm";
import ArticleBody from "./ArticleBody";
import { tiptapText, firstParagraphText } from "@/lib/article-body";
import "./article-content.css";

function imgSrc(src?: string | null): string | null {
    if (!src) return null;
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return "/" + src.replace(/^\.?\//, "");
}

function readingMinutes(text: string): number {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
}

function Rail({ title, items }: { title: string; items: Article[] }) {
    if (items.length === 0) return null;
    return (
        <div className="art-rail">
            <h4 className="art-rail-title">{title}</h4>
            <ul className="art-rail-list">
                {items.map((it) => {
                    const s = imgSrc(it.image);
                    return (
                        <li key={it.slug}>
                            <Link href={`/articles/${it.slug}`} className="art-rail-item">
                                <span className="art-rail-thumb">
                                    {s ? <Image src={s} alt="" fill sizes="84px" style={{ objectFit: "cover" }} /> : <span className="art-rail-ph" />}
                                </span>
                                <span className="art-rail-meta">
                                    <span className="art-rail-h">{it.title}</span>
                                    {it.date ? <span className="art-rail-date">{it.date}</span> : null}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const a = await getArticleBySlug(params.slug);
    if (!a) return { title: "Article not found — vegan eating" };
    return { title: `${a.title} — vegan eating`, description: firstParagraphText(a.body).slice(0, 155) };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
    const a = await getArticleBySlug(params.slug);
    if (!a) notFound();

    const img = imgSrc(a.image);
    const bodyText = tiptapText(a.body);
    const mins = readingMinutes(bodyText);

    const [related, popular, recent] = await Promise.all([
        listRelatedArticles(a.category, a.slug, 6),
        listPopularArticles(a.slug, 5),
        listRecentArticles(a.slug, 6),
    ]);
    const toItem = (x: Article) => ({ slug: x.slug, title: x.title, date: x.date, image: x.image });

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: a.title,
        image: img ? [img] : undefined,
        datePublished: a.date || undefined,
        articleBody: bodyText,
        mainEntityOfPage: a.sourceUrl || undefined,
        author: { "@type": "Organization", name: "vegan eating" },
        publisher: { "@type": "Organization", name: "vegan eating" },
    };

    return (
        <>
            <ReadingProgress />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

            <section className="recipe-hero">
                <div className="hero-bg">
                    {img ? (
                        <Image src={img} alt={a.title} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
                    ) : (
                        <div className="ph p4" />
                    )}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,30,20,.40), rgba(20,30,20,.64))" }} />
                </div>
                {!img && <span className="hero-photo-note">Your hero photo here</span>}
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    <span className="kicker" style={{ color: "#A7D98C" }}>{a.category || "Health"}</span>
                    <HeroTitle title={a.title} style={{ fontSize: "clamp(34px,4.8vw,60px)", margin: "16px 0 14px", maxWidth: 820, lineHeight: 1.08 }} />
                    <div className="hero-meta">
                        {a.date ? <span>{a.date}</span> : null}
                        <span>⏱ <b>{mins} min read</b></span>
                    </div>
                </div>
            </section>

            <div className="wrap">
                <div className="recipe-body">
                    <aside>
                        <div className="art-aside">
                            <NewsletterForm />
                            <Rail title="Related Articles" items={related.slice(0, 4)} />
                            <Rail title="Most Popular" items={popular} />
                        </div>
                    </aside>

                    <div>
                        <ArticleBody doc={a.body} />

                        <hr className="art-sep" />

                        <div className="art-tagsbar">
                            <span className="art-tags-label">Tags</span>
                            {a.tags.length > 0 ? (
                                a.tags.map((t) => <span key={t} className="art-tagchip">{t}</span>)
                            ) : (
                                <span className="art-tags-empty">No tags yet</span>
                            )}
                        </div>

                        <ShareButtons title={a.title} />

                        {/* Static for now — will be replaced by the article author's profile (avatar + bio + links). */}
                        <div className="art-author">
                            <div className="art-author-avatar" />
                            <div className="art-author-main">
                                <h4 className="art-author-name">The vegan eating kitchen</h4>
                                <p className="art-author-bio">
                                    Recipes and reads tested in our own kitchen — no plugins, no ads, just plant-based cooking we actually make.
                                    Every guide here is written and edited by the vegan eating team.
                                </p>
                                <div className="art-author-links">
                                    <a href="#" aria-label="Instagram">
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <rect x="3" y="3" width="18" height="18" rx="5" />
                                            <circle cx="12" cy="12" r="4" />
                                            <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                                        </svg>
                                    </a>
                                    <a href="#" aria-label="Pinterest">
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                                            <path d="M12 2C6.5 2 4 5.6 4 8.6c0 1.8.7 3.4 2.2 4 .2.1.4 0 .5-.3l.2-.8c.1-.2 0-.3-.1-.5-.4-.5-.7-1.1-.7-2 0-2.6 1.9-4.9 5-4.9 2.7 0 4.2 1.7 4.2 3.9 0 2.9-1.3 5.4-3.2 5.4-1 0-1.8-.9-1.6-1.9.3-1.3.8-2.6.8-3.5 0-.8-.4-1.5-1.3-1.5-1.1 0-1.9 1.1-1.9 2.6 0 .9.3 1.6.3 1.6s-1.1 4.5-1.3 5.3c-.3 1.4 0 3.1 0 3.3 0 .1.2.2.3.1.1-.1 1.5-1.9 2-3.6l.7-2.7c.4.7 1.4 1.3 2.5 1.3 3.3 0 5.6-3 5.6-7.1C20 5.1 16.7 2 12 2z" />
                                        </svg>
                                    </a>
                                    <a href="#" aria-label="Newsletter">
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <rect x="3" y="5" width="18" height="14" rx="2" />
                                            <path d="M3 7l9 6 9-6" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <OtherPosts related={related.map(toItem)} author={recent.map(toItem)} />
                    </div>
                </div>
            </div>
        </>
    );
}