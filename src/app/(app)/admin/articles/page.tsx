// src/app/(app)/admin/articles/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { listArticlesAdmin } from "@/lib/articles";
import ArticleRow from "./ArticleRow";
import ArticleImport from "./ArticleImport";
import "../recipes/admin-recipes.css";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminArticlesPage({
                                                    searchParams,
                                                }: {
    searchParams: { q?: string; page?: string; sort?: string };
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const q = (searchParams?.q ?? "").trim();
    const sort = searchParams?.sort || "default";
    const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);

    const orderBy: Prisma.ArticleOrderByWithRelationInput =
        sort === "newest" ? { date: "desc" }
            : sort === "oldest" ? { date: "asc" }
                : { sort: "asc" };

    const where: Prisma.ArticleWhereInput = q ? { title: { contains: q } } : {};

    const { items: articles, total, totalPages } = await listArticlesAdmin({ page, perPage: PER_PAGE, where, orderBy });

    const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    const hrefWith = (over: { q?: string; sort?: string; page?: number }) => {
        const qq = over.q !== undefined ? over.q : q;
        const ss = over.sort !== undefined ? over.sort : sort;
        const pp = over.page !== undefined ? over.page : 1;
        const sp = new URLSearchParams();
        if (qq) sp.set("q", qq);
        if (ss && ss !== "default") sp.set("sort", ss);
        if (pp > 1) sp.set("page", String(pp));
        const qs = sp.toString();
        return qs ? `/admin/articles?${qs}` : "/admin/articles";
    };

    return (
        <div className="admin-recipes">
            <div className="ar-head">
                <span className="ar-kicker">Content</span>
                <h1 className="ar-title">Articles</h1>
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
                {q && <Link href={hrefWith({ q: "", page: 1 })} className="ar-clear">Clear</Link>}
            </form>

            <div className="ar-filterbar">
                <span className="ar-pills-label">All articles</span>
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