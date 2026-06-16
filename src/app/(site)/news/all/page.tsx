// src/app/(site)/news/all/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import PageHero from "@/components/PageHero";
import Pagination from "@/components/Pagination";
import "../news.css";          // .nws-* card styles, shared with the Dispatch
import "./news-archive.css";   // .nwsa-* filter bar + grid

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "All news — vegan eating",
    description: "Browse every vegan and vegetarian story we've gathered, across food, health, and lifestyle.",
};

const PER_PAGE = 24;

const CATS = [
    { value: "food", label: "Food" },
    { value: "health", label: "Health" },
    { value: "lifestyle", label: "Lifestyle" },
];

function fmt(d: Date): string {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AllNewsPage({
                                              searchParams,
                                          }: {
    searchParams: { cat?: string; q?: string; page?: string };
}) {
    const cat = (searchParams?.cat ?? "").trim();
    const q = (searchParams?.q ?? "").trim();
    const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);
    const activeCat = CATS.some((c) => c.value === cat) ? cat : "";

    const where: Prisma.NewsArticleWhereInput = {
        hidden: false,
        // categories is a JSON array string like ["food","health"] — substring match on the quoted value.
        ...(activeCat ? { categories: { contains: `"${activeCat}"` } } : {}),
        ...(q ? { title: { contains: q } } : {}),
    };

    const [rows, total] = await Promise.all([
        prisma.newsArticle.findMany({ where, orderBy: { pubDate: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
        prisma.newsArticle.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    // For the pills + search only (page links are handled by <Pagination>).
    const hrefWith = (over: { cat?: string; q?: string }) => {
        const cc = over.cat !== undefined ? over.cat : activeCat;
        const qq = over.q !== undefined ? over.q : q;
        const sp = new URLSearchParams();
        if (cc) sp.set("cat", cc);
        if (qq) sp.set("q", qq);
        const s = sp.toString();
        return s ? `/news/all?${s}` : "/news/all";
    };

    return (
        <>
            <PageHero
                image="/header/news3.jpg"
                kicker="vegan eating · news & notes"
                title="All news"
                dek="Every vegan and vegetarian story we've gathered — food, health, and lifestyle."
            />

            <div className="nwsa-wrap">
                <div className="nwsa-bar">
                    <div className="nwsa-pills">
                        <Link href={hrefWith({ cat: "", q: "" })} className={`nwsa-pill${!activeCat ? " active" : ""}`}>All</Link>
                        {CATS.map((c) => (
                            <Link key={c.value} href={hrefWith({ cat: c.value })} className={`nwsa-pill${activeCat === c.value ? " active" : ""}`}>
                                {c.label}
                            </Link>
                        ))}
                    </div>
                    <form className="nwsa-search" method="get" action="/news/all">
                        {activeCat && <input type="hidden" name="cat" value={activeCat} />}
                        <input type="search" name="q" defaultValue={q} placeholder="Search stories…" aria-label="Search news" />
                        <button type="submit">Search</button>
                    </form>
                </div>

                <p className="nwsa-count">{total === 0 ? "No stories found" : `Showing ${from}–${to} of ${total}`}</p>

                {rows.length === 0 ? (
                    <p className="nwsa-empty">No stories match — try clearing the filter.</p>
                ) : (
                    <>
                        <div className="nwsa-grid">
                            {rows.map((r) => (
                                <article className="nws-story" key={r.slug}>
                                    <Link href={`/news/${r.slug}`} className="nws-card-media" aria-label={r.title}>
                                        {r.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={r.image} alt={r.title} loading="lazy" />
                                        ) : (
                                            <span className="ph p3" aria-hidden="true" />
                                        )}
                                    </Link>
                                    <span className="nws-kind" data-kind="Industry">{r.source || "News"}</span>
                                    <h3 className="nws-story-title">
                                        <Link className="nws-link" href={`/news/${r.slug}`}>{r.title}</Link>
                                    </h3>
                                    <p className="nws-byline">{fmt(r.pubDate)}</p>
                                </article>
                            ))}
                        </div>

                        <Pagination
                            page={page}
                            totalPages={totalPages}
                            basePath="/news/all"
                            params={{ cat: activeCat || undefined, q: q || undefined }}
                        />
                    </>
                )}
            </div>
        </>
    );
}