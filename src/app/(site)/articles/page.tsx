// src/app/articles/page.tsx
import Link from "next/link";
import Image from "next/image";
import Pagination from "@/components/Pagination";
import { listArticles } from "@/lib/articles";
import { ARTICLE_CATEGORIES } from "@/lib/categories";
import { slugify } from "@/lib/recipe-filters";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Health & articles — vegan eating" };

export default async function ArticlesPage({ searchParams }: { searchParams: { page?: string; cat?: string } }) {
    const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
    const activeCat = searchParams.cat || "all";

    // Pills carry a slug; the stored category is the human label, so map back before filtering.
    const catLabel =
        activeCat === "all" ? "" : (ARTICLE_CATEGORIES.find((c) => slugify(c.value) === activeCat)?.value ?? "");

    const { items, total, totalPages } = await listArticles(page, 12, catLabel || undefined);

    return (
        <>
            <PageHero
                image="/header/articles.jpg"
                kicker="Health & Living"
                title="We rebuilt the whole thing by hand"
                dek="No WordPress, no plugins, no ads creeping in at the margins. Just a community, a recipe archive, and a lot of testing."
            />

            <div className="cats" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="wrap">
                    <span className="label">Filter</span>
                    <Link href="/articles" className={`pill${activeCat === "all" ? " active" : ""}`}>All</Link>
                    {ARTICLE_CATEGORIES.map((c) => {
                        const slug = slugify(c.value);
                        const href = `/articles?cat=${slug}`;
                        return <Link key={c.value} href={href} className={`pill${slug === activeCat ? " active" : ""}`}>{c.label}</Link>;
                    })}
                </div>
            </div>

            <div className="wrap" style={{ paddingBottom: 60 }}>
                <section style={{ paddingTop: 20 }}>
                    {items.length > 0 ? (
                        <>
                            <div className="grid">
                                {items.map((a) => (
                                    <Link key={a.slug} href={`/articles/${a.slug}`} className="card">
                                        {a.image ? (
                                            <div className="photo"><Image src={a.image} alt={a.title} fill sizes="(max-width:600px) 92vw, (max-width:1024px) 45vw, 360px" style={{ objectFit: "cover" }} /></div>
                                        ) : (
                                            <div className="photo"><div className="ph p6" /><span className="ph-label">Article</span></div>
                                        )}
                                        <span className="tag">{a.category || "Health"}</span>
                                        <h3>{a.title}</h3>
                                        {a.date ? <div className="meta"><span>{a.date}</span></div> : null}
                                    </Link>
                                ))}
                            </div>
                            <Pagination page={page} totalPages={totalPages} basePath="/articles" params={{ cat: searchParams.cat }} />
                        </>
                    ) : (
                        <p style={{ textAlign: "center", color: "var(--muted)", padding: "60px 0" }}>
                            No articles in this category yet. <Link href="/articles" style={{ color: "var(--terra)" }}>Clear filter</Link>
                        </p>
                    )}
                </section>
            </div>
        </>
    );
}