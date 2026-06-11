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
import ArticleFigure from "./ArticleFigure";
import "./article-content.css";

function imgSrc(src?: string | null): string | null {
    if (!src) return null;
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return "/" + src.replace(/^\.?\//, "");
}

function readingMinutes(body: string[]): number {
    const words = body.join(" ").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
}

// --- Body blocks: drop-cap lead, normal paragraphs, and full-width images
// woven in — first image directly after paragraph 1, the rest spread evenly
// downward. Short single-sentence "1-liner" paragraphs become pull-quotes. -----
type Block =
    | { kind: "lead"; text: string }
    | { kind: "para"; text: string }
    | { kind: "quote"; text: string }
    | { kind: "imageFull"; src: string };

// A "1-liner": one short sentence on its own — reads like a pull-quote.
function isOneLiner(text: string): boolean {
    const t = text.trim();
    if (!t) return false;
    const words = t.split(/\s+/).length;
    const sentences = (t.match(/[.!?](?:\s|$)/g) || []).length;
    return words <= 16 && sentences <= 1;
}

function buildArticleBlocks(body: string[], gallery: string[]): Block[] {
    const blocks: Block[] = [];
    const imgs = gallery.map((s) => s.trim()).filter(Boolean);
    const paras = body.map((p) => (p ?? "").trim()).filter(Boolean);
    const n = paras.length;
    const m = imgs.length;

    if (n === 0) {
        imgs.forEach((src) => blocks.push({ kind: "imageFull", src }));
        return blocks;
    }

    // Insert image j *after* paragraph index positions[j]. First image goes
    // right after paragraph 1 (index 0); the rest spread across the article.
    const positions: number[] = [];
    for (let j = 0; j < m; j++) {
        let pos = j === 0 ? 0 : Math.round((j * (n - 1)) / m);
        if (positions.length) pos = Math.max(pos, positions[positions.length - 1] + 1);
        positions.push(Math.min(pos, n - 1));
    }

    let ip = 0;
    for (let i = 0; i < n; i++) {
        const text = paras[i];
        if (i === 0) blocks.push({ kind: "lead", text });
        else blocks.push(isOneLiner(text) ? { kind: "quote", text } : { kind: "para", text });
        while (ip < m && positions[ip] === i) {
            blocks.push({ kind: "imageFull", src: imgs[ip] });
            ip++;
        }
    }
    while (ip < m) { blocks.push({ kind: "imageFull", src: imgs[ip] }); ip++; }
    return blocks;
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
    return { title: `${a.title} — vegan eating`, description: (a.body[0] || "").slice(0, 155) };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
    const a = await getArticleBySlug(params.slug);
    if (!a) notFound();

    const img = imgSrc(a.image);
    const mins = readingMinutes(a.body);
    const blocks = buildArticleBlocks(a.body, a.gallery ?? []);

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
        articleBody: a.body.join("\n\n"),
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
                        <div className="article-body">
                            {blocks.map((b, i) => {
                                switch (b.kind) {
                                    case "lead":
                                        return (
                                            <p key={i} className="art-lead">
                                                <span className="art-dropcap">{b.text.charAt(0)}</span>
                                                {b.text.slice(1)}
                                            </p>
                                        );
                                    case "para":
                                        return <p key={i} className="art-p">{b.text}</p>;
                                    case "quote":
                                        return <blockquote key={i} className="art-quote">{b.text}</blockquote>;
                                    case "imageFull":
                                        return <ArticleFigure key={i} src={b.src} className="art-img art-full" sizes="(max-width:1024px) 90vw, 680px" />;
                                }
                            })}
                        </div>

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
                                    <a href="#">Instagram</a><span>|</span><a href="#">Pinterest</a><span>|</span><a href="#">Newsletter</a>
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