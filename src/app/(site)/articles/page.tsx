// src/app/articles/page.tsx
import Link from "next/link";
import Image from "next/image";
import Pagination from "@/components/Pagination";
import { listArticles } from "@/lib/articles";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Health & articles — vegan eating" };

export default async function ArticlesPage({ searchParams }: { searchParams: { page?: string } }) {
    const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
    const { items, total, totalPages } = await listArticles(page, 12);
    return (
        <>
            <section className="recipe-hero">
                <div className="hero-bg">
                    {/* Placeholder colour for now — swap this <div> for an <Image fill> later. */}
                    <div className="ph p4" />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,30,20,.35), rgba(20,30,20,.60))" }} />
                </div>
                <span className="hero-photo-note">Your hero photo here</span>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    <span className="kicker" style={{ color: "#A7D98C" }}>Health &amp; living</span>
                    <h1 style={{ marginTop: 12, maxWidth: 760 }}>{total ? `${total.toLocaleString()} articles` : "Articles"}</h1>
                    <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>
                        {total
                            ? `Guides and deep-dives on plant-based living. Page ${page} of ${totalPages}.`
                            : "Run the crawler and seed the database to import articles — see the README."}
                    </p>
                </div>
            </section>

            <div className="wrap" style={{ paddingBottom: 60 }}>
                <section style={{ paddingTop: 20 }}>
                    <div className="grid">
                        {items.map((a) => (
                            <Link key={a.slug} href={`/articles/${a.slug}`} className="card">
                                {a.image ? (
                                    <div className="photo"><Image src={a.image} alt={a.title} fill sizes="(max-width:600px) 92vw, (max-width:1024px) 45vw, 360px" style={{ objectFit: "cover" }} /></div>
                                ) : (
                                    <div className="photo"><div className="ph p6" /><span className="ph-label">Article</span></div>
                                )}
                                <span className="tag">Health</span>
                                <h3>{a.title}</h3>
                                {a.date ? <div className="meta"><span>{a.date}</span></div> : null}
                            </Link>
                        ))}
                    </div>
                    <Pagination page={page} totalPages={totalPages} basePath="/articles" />
                </section>
            </div>
        </>
    );
}