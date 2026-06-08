// src/app/articles/[slug]/page.tsx
import Link from "next/link";
import Image from "next/image";
import { getArticleBySlug } from "@/lib/articles";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReadingProgress from "@/components/ReadingProgress";
import HeroTitle from "@/components/HeroTitle";

// Normalise bare image paths ("2025/01/foo.jpg" -> "/2025/01/foo.jpg").
function imgSrc(src?: string | null): string | null {
    if (!src) return null;
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return "/" + src.replace(/^\.?\//, "");
}

function readingMinutes(body: string[]): number {
    const words = body.join(" ").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
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
    const lead = a.body[0] || "";
    const rest = a.body.slice(1);
    const dropCap = lead.charAt(0);
    const leadRest = lead.slice(1);

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
                    <span className="kicker" style={{ color: "#A7D98C" }}>Health</span>
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
                        <div className="ing-card" style={{ position: "sticky", top: 100 }}>
                            <span className="kicker">This read</span>
                            <p style={{ marginTop: 8, color: "var(--muted)", fontSize: 14.5 }}>
                                {a.date ? `${a.date} · ` : ""}{mins} min read
                            </p>
                            <div style={{ borderTop: "1px solid var(--line)", margin: "18px 0" }} />
                            <strong style={{ fontFamily: "Fraunces, serif", fontSize: 19 }}>Hungry now?</strong>
                            <p style={{ color: "var(--muted)", fontSize: 14, margin: "6px 0 16px" }}>Put this into practice with a tested recipe.</p>
                            <Link href="/recipes" className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                                Browse recipes
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                            </Link>
                            {a.sourceUrl ? (
                                <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
                                    <a href={a.sourceUrl} style={{ color: "var(--terra)" }}>View original</a>
                                </p>
                            ) : null}
                        </div>
                    </aside>

                    <div>
                        <div className="article-body">
                            {lead ? (
                                <p style={{ fontSize: 20, lineHeight: 1.65, marginBottom: 22, color: "var(--ink, #1b2a1d)" }}>
                  <span
                      style={{
                          float: "left",
                          fontFamily: "Fraunces, serif",
                          fontWeight: 600,
                          fontSize: 66,
                          lineHeight: 0.82,
                          paddingRight: 12,
                          paddingTop: 8,
                          color: "var(--carrot, #E15A22)",
                      }}
                  >
                    {dropCap}
                  </span>
                                    {leadRest}
                                </p>
                            ) : null}

                            {rest.map((p, i) => (
                                <p key={i} style={{ fontSize: 17.5, lineHeight: 1.75, marginBottom: 20 }}>{p}</p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}