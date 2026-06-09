// src/app/articles/page.tsx
import Link from "next/link";
import Image from "next/image";
import Pagination from "@/components/Pagination";
import { listArticles } from "@/lib/articles";
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = { title: "Health & articles — vegan eating" };

export default async function ArticlesPage({ searchParams }: { searchParams: { page?: string } }) {
    const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
    const { items, total, totalPages } = await listArticles(page, 12);
    return (
        <>
            <PageHero
                image="/header/recipes.jpg"
                kicker="Health & Living"
                title="We rebuilt the whole thing by hand"
                dek="No WordPress, no plugins, no ads creeping in at the margins. Just a community, a recipe archive, and a lot of testing."
            />
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