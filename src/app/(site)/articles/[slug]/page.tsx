// src/app/articles/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { getArticleBySlug, listRelatedArticles, listPopularArticles, listRecentArticles } from "@/lib/articles";
import { viewSummary } from "@/lib/views";
import { auth } from "@/auth";
import type { Article } from "@/data/articles";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReadingProgress from "@/components/ReadingProgress";
import HeroTitle from "@/components/HeroTitle";
import RecipeViews from "@/components/RecipeViews";
import PostFooter from "@/components/post/PostFooter";
import NewsletterForm from "./NewsletterForm";
import ArticleBody from "./ArticleBody";
import { tiptapText, firstParagraphText } from "@/lib/article-body";
import "./article-content.css";

export const dynamic = "force-dynamic";
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

export default async function ArticlePage({ params, searchParams }: { params: { slug: string }; searchParams?: { cpage?: string } }) {
    const a = await getArticleBySlug(params.slug);
    if (!a) notFound();

    const cpage = Number(searchParams?.cpage) || 1;

    const img = imgSrc(a.image);
    const bodyText = tiptapText(a.body);
    const mins = readingMinutes(bodyText);
    const views = await viewSummary("article", String(a.id));
    const session = await auth();
    const viewerKey = session?.user?.id ?? session?.user?.email ?? "anon";

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
                    <RecipeViews kind="article" slug={a.slug} count={views.count} initials={views.initials} viewerKey={viewerKey} log />
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

                        <PostFooter
                            tags={a.tags}
                            shareTitle={a.title}
                            shareNoun="article"
                            authorName="Vegor"
                            commentTarget={{ articleId: a.id! }}
                            commentPath={`/articles/${params.slug}`}
                            commentPage={cpage}
                            related={related.map(toItem)}
                            more={recent.map(toItem)}
                            basePath="/articles"
                            otherTitle="Other posts"
                            relatedLabel="Related Articles"
                            moreLabel="More from Author"
                        />
                    </div>
                </div>
            </div>
        </>
    );
}