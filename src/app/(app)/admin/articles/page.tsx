// src/app/(app)/admin/articles/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { listArticlesAdmin } from "@/lib/articles";
import { ARTICLE_CATEGORIES } from "@/lib/categories";
import { slugify } from "@/lib/recipe-filters";
import ArticleRow from "./ArticleRow";
import ArticleImport from "./ArticleImport";
import "../recipes/admin-recipes.css";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminArticlesPage({
                                                    searchParams,
                                                }: {
    searchParams: { q?: string; page?: string; sort?: string; cat?: string };
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const q = (searchParams?.q ?? "").trim();
    const sort = searchParams?.sort || "default";
    const activeCat = searchParams?.cat || "all";
    const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);

    // Pills carry a slug in the URL; the stored category is the human label, so map back.
    const catLabel =
        activeCat === "all" ? "" : (ARTICLE_CATEGORIES.find((c) => slugify(c.value) === activeCat)?.value ?? "");

    const orderBy: Prisma.ArticleOrderByWithRelationInput =
        sort === "newest" ? { date: "desc" }
            : sort === "oldest" ? { date: "asc" }
                : { sort: "asc" };

    const where: Prisma.ArticleWhereInput = {
        ...(q ? { title: { contains: q } } : {}),
        ...(catLabel ? { category: catLabel } : {}),
    };

    const { items: articles, total, totalPages } = await listArticlesAdmin({ page, perPage: PER_PAGE, where, orderBy });

    const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    const hrefWith = (over: { q?: string; sort?: string; cat?: string; page?: number }) => {
        const qq = over.q !== undefined ? over.q : q;
        const ss = over.sort !== undefined ? over.sort : sort;
        const cc = over.cat !== undefined ? over.cat : activeCat;
        const pp = over.page !== undefined ? over.page : 1;
        const sp = new URLSearchParams();
        if (qq) sp.set("q", qq);
        if (ss && ss !== "default") sp.set("sort", ss);
        if (cc && cc !== "all") sp.set("cat", cc);
        if (pp > 1) sp.set("page", String(pp));
        const qs = sp.toString();
        return qs ? `/admin/articles?${qs}` : "/admin/articles";
    };

    return (
        <div className="admin-recipes">
            <div className="ar-head">
                <p style={kicker}>Content</p>
                <h1 style={h1}>Articles</h1>
                <p className="ar-dek">{total} article{total === 1 ? "" : "s"} in the library.</p>
            </div>

            <div className="ar-tools">
                <a href="/api/admin/articles/export" className="ar-export">⬇ Export to Excel</a>
                <ArticleImport />
            </div>

            <form className="ar-search" method="get" action="/admin/articles">
                <input type="search" name="q" defaultValue={q} placeholder="Search by title…" aria-label="Search articles by title" />
                {sort !== "default" && <input type="hidden" name="sort" value={sort} />}
                <button type="submit">Search</button>
                {(q || activeCat !== "all") && <Link href={hrefWith({ q: "", cat: "all", page: 1 })} className="ar-clear">Clear</Link>}
            </form>

            <div className="ar-filterbar">
                <div className="ar-pills">
                    <span className="ar-pills-label">Filter</span>
                    <Link href={hrefWith({ cat: "all", q: "", page: 1 })} className={`ar-pill${activeCat === "all" ? " active" : ""}`}>All</Link>
                    {ARTICLE_CATEGORIES.map((c) => {
                        const slug = slugify(c.value);
                        const isActive = !q && slug === activeCat;
                        return (
                            <Link key={c.value} href={hrefWith({ cat: slug, q: "", page: 1 })} className={`ar-pill${isActive ? " active" : ""}`}>{c.label}</Link>
                        );
                    })}
                </div>
                <div className="ar-sort">
                    <span className="ar-sort-label">Sort</span>
                    <Link href={hrefWith({ sort: sort === "newest" ? "default" : "newest", page: 1 })} className={`ar-sortbtn${sort === "newest" ? " active" : ""}`}>Newest</Link>
                    <Link href={hrefWith({ sort: sort === "oldest" ? "default" : "oldest", page: 1 })} className={`ar-sortbtn${sort === "oldest" ? " active" : ""}`}>Oldest</Link>
                </div>
            </div>

            <p className="ar-count">{total === 0 ? "No matches." : `Showing ${from}–${to} of ${total}`}</p>

            <div className="ar-list">
                {articles.map((a) => (
                    <ArticleRow
                        key={a.slug}
                        article={{
                            slug: a.slug,
                            title: a.title,
                            sourceUrl: a.sourceUrl,
                            date: a.date,
                            image: a.image,
                            hidden: a.hidden,
                            category: a.category,
                            tags: a.tags,
                        }}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <nav className="ar-pager" aria-label="Pagination">
                    {page > 1 ? <Link href={hrefWith({ page: page - 1 })} className="ar-pagebtn">← Prev</Link> : <span className="ar-pagebtn is-disabled">← Prev</span>}
                    <span className="ar-pageinfo">Page {page} of {totalPages}</span>
                    {page < totalPages ? <Link href={hrefWith({ page: page + 1 })} className="ar-pagebtn">Next →</Link> : <span className="ar-pagebtn is-disabled">Next →</span>}
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