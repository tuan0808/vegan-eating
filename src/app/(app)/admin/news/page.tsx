// src/app/(app)/admin/news/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import NewsRow from "./NewsRow";
import "../recipes/admin-recipes.css";
import type { Prisma } from "@prisma/client";
import NewsSyncButton from "./NewsSyncButton";
import NewsImport from "./NewsImport";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

// newsdata's three categories we sync. Filtering matches against the stored JSON array.
const NEWS_CATEGORIES = [
    { value: "food", label: "Food" },
    { value: "health", label: "Health" },
    { value: "lifestyle", label: "Lifestyle" },
];

function parseCategories(json: string): string[] {
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
        return [];
    }
}

export default async function AdminNewsPage({
                                                searchParams,
                                            }: {
    searchParams: { q?: string; page?: string; sort?: string; cat?: string };
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const q = (searchParams?.q ?? "").trim();
    const sort = searchParams?.sort || "newest";
    const activeCat = searchParams?.cat || "all";
    const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);

    const orderBy: Prisma.NewsArticleOrderByWithRelationInput =
        sort === "oldest" ? { pubDate: "asc" } : { pubDate: "desc" };

    const where: Prisma.NewsArticleWhereInput = {
        ...(q ? { title: { contains: q } } : {}),
        // categories is a JSON string like ["food","health"] — substring match on the quoted value.
        ...(activeCat !== "all" ? { categories: { contains: `"${activeCat}"` } } : {}),
    };

    const [rows, total] = await Promise.all([
        prisma.newsArticle.findMany({ where, orderBy, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
        prisma.newsArticle.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    const hrefWith = (over: { q?: string; sort?: string; cat?: string; page?: number }) => {
        const qq = over.q !== undefined ? over.q : q;
        const ss = over.sort !== undefined ? over.sort : sort;
        const cc = over.cat !== undefined ? over.cat : activeCat;
        const pp = over.page !== undefined ? over.page : 1;
        const sp = new URLSearchParams();
        if (qq) sp.set("q", qq);
        if (ss && ss !== "newest") sp.set("sort", ss);
        if (cc && cc !== "all") sp.set("cat", cc);
        if (pp > 1) sp.set("page", String(pp));
        const qs = sp.toString();
        return qs ? `/admin/news?${qs}` : "/admin/news";
    };

    return (
        <div className="admin-recipes">
            <div className="ar-head">
                <p style={kicker}>Content</p>
                <h1 style={h1}>News</h1>
                <p className="ar-dek">{total} stor{total === 1 ? "y" : "ies"} in the backlog.</p>
            </div>
            <div className="ar-tools">
                <NewsSyncButton />
                <a href="/api/admin/news/export" className="ar-export">⬇ Export to Excel</a>
                <NewsImport />
            </div>

            <form className="ar-search" method="get" action="/admin/news">
                <input type="search" name="q" defaultValue={q} placeholder="Search by title…"
                       aria-label="Search news by title"/>
                {sort !== "newest" && <input type="hidden" name="sort" value={sort}/>}
                <button type="submit">Search</button>
                {(q || activeCat !== "all") &&
                    <Link href={hrefWith({q: "", cat: "all", page: 1})} className="ar-clear">Clear</Link>}
            </form>

            <div className="ar-filterbar">
                <div className="ar-pills">
                    <span className="ar-pills-label">Filter</span>
                    <Link href={hrefWith({cat: "all", q: "", page: 1})}
                          className={`ar-pill${activeCat === "all" ? " active" : ""}`}>All</Link>
                    {NEWS_CATEGORIES.map((c) => {
                        const isActive = !q && c.value === activeCat;
                        return (
                            <Link key={c.value} href={hrefWith({cat: c.value, q: "", page: 1})}
                                  className={`ar-pill${isActive ? " active" : ""}`}>{c.label}</Link>
                        );
                    })}
                </div>
                <div className="ar-sort">
                    <span className="ar-sort-label">Sort</span>
                    <Link href={hrefWith({sort: "newest", page: 1})}
                          className={`ar-sortbtn${sort === "newest" ? " active" : ""}`}>Newest</Link>
                    <Link href={hrefWith({sort: "oldest", page: 1})}
                          className={`ar-sortbtn${sort === "oldest" ? " active" : ""}`}>Oldest</Link>
                </div>
            </div>

            <p className="ar-count">{total === 0 ? "No matches." : `Showing ${from}–${to} of ${total}`}</p>

            <div className="ar-list">
                {rows.map((r) => (
                    <NewsRow
                        key={r.slug}
                        item={{
                            slug: r.slug,
                            title: r.title,
                            source: r.source,
                            date: r.pubDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                            }),
                            image: r.image,
                            hidden: r.hidden,
                            categories: parseCategories(r.categories),
                        }}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <nav className="ar-pager" aria-label="Pagination">
                    {page > 1 ? <Link href={hrefWith({page: page - 1})} className="ar-pagebtn">← Prev</Link> :
                        <span className="ar-pagebtn is-disabled">← Prev</span>}
                    <span className="ar-pageinfo">Page {page} of {totalPages}</span>
                    {page < totalPages ? <Link href={hrefWith({page: page + 1})} className="ar-pagebtn">Next →</Link> :
                        <span className="ar-pagebtn is-disabled">Next →</span>}
                </nav>
            )}
        </div>
    );
}

const kicker: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--terra, #c2603a)",
};
const h1: React.CSSProperties = {
    fontFamily: 'var(--display, "Fraunces", serif)',
    fontSize: 32,
    color: "var(--ink, #1c2317)",
    margin: "8px 0 0",
};