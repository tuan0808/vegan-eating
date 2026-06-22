// src/app/(app)/admin/articles/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { listArticlesAdmin } from "@/lib/articles";
import { ARTICLE_CATEGORIES } from "@/lib/categories";
import { slugify } from "@/lib/recipe-filters";
import ArticleAdminList from "./ArticleAdminList";
import ArticleImport from "./ArticleImport";
import "../recipes/admin-recipes.css";
import "./admin-articles.css";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminArticlesPage({
                                                    searchParams,
                                                }: {
    searchParams: { q?: string; page?: string; sort?: string; cat?: string; view?: string };
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const q = (searchParams?.q ?? "").trim();
    const sort = searchParams?.sort || "default";
    const activeCat = searchParams?.cat || "all";
    const view = searchParams?.view === "hidden" || searchParams?.view === "dupes" ? searchParams.view : "";
    const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);

    // Pills carry a slug in the URL; the stored category is the human label, so map back.
    const catLabel =
        activeCat === "all" ? "" : (ARTICLE_CATEGORIES.find((c) => slugify(c.value) === activeCat)?.value ?? "");

    // --- Duplicate detection + hidden count (one light pass over all rows) -----
    // A duplicate = identical (trimmed) title. The OLDEST by date is the original
    // and is never flagged; every later one in the group is a duplicate.
    const lite = await prisma.article.findMany({
        select: { slug: true, title: true, date: true, id: true, hidden: true },
        orderBy: [{ title: "asc" }, { date: "asc" }, { id: "asc" }],
    });

    let hiddenCount = 0;
    const seenTitles = new Set<string>();
    const dupeSlugs: string[] = [];
    for (const a of lite) {
        if (a.hidden) hiddenCount++;
        const key = (a.title ?? "").trim();
        if (seenTitles.has(key)) dupeSlugs.push(a.slug); // not the first -> duplicate
        else seenTitles.add(key); // first occurrence (oldest) -> original, keep
    }
    const dupeCount = dupeSlugs.length;

    // --- Search: case-insensitive, every word must appear in the title ---------
    const words = q.split(/\s+/).filter(Boolean);
    const titleWhere: Prisma.ArticleWhereInput =
        words.length > 0
            ? { AND: words.map((w) => ({ title: { contains: w, mode: "insensitive" as Prisma.QueryMode } })) }
            : {};

    const where: Prisma.ArticleWhereInput = {
        ...titleWhere,
        ...(catLabel ? { category: catLabel } : {}),
        ...(view === "hidden" ? { hidden: true } : {}),
        ...(view === "dupes" ? { slug: { in: dupeSlugs } } : {}),
    };

    // In the dupes view, group identical titles together so pairs are obvious.
    const orderBy: Prisma.ArticleOrderByWithRelationInput =
        view === "dupes" ? { title: "asc" }
            : sort === "newest" ? { date: "desc" }
                : sort === "oldest" ? { date: "asc" }
                    : { sort: "asc" };

    const { items: articles, total, totalPages } = await listArticlesAdmin({ page, perPage: PER_PAGE, where, orderBy });

    // Every slug matching the current filter (all pages) — powers "select all".
    const allMatching = await prisma.article.findMany({ where, select: { slug: true } });
    const allMatchingSlugs = allMatching.map((a) => a.slug);

    const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    const hrefWith = (over: { q?: string; sort?: string; cat?: string; view?: string; page?: number }) => {
        const qq = over.q !== undefined ? over.q : q;
        const ss = over.sort !== undefined ? over.sort : sort;
        const cc = over.cat !== undefined ? over.cat : activeCat;
        const vv = over.view !== undefined ? over.view : view;
        const pp = over.page !== undefined ? over.page : 1;
        const sp = new URLSearchParams();
        if (qq) sp.set("q", qq);
        if (ss && ss !== "default") sp.set("sort", ss);
        if (cc && cc !== "all") sp.set("cat", cc);
        if (vv) sp.set("view", vv);
        if (pp > 1) sp.set("page", String(pp));
        const qs = sp.toString();
        return qs ? `/admin/articles?${qs}` : "/admin/articles";
    };

    const countLabel =
        view === "hidden" ? `${total} hidden article${total === 1 ? "" : "s"}`
            : view === "dupes" ? `${total} duplicate${total === 1 ? "" : "s"} (originals not shown)`
                : `${total} article${total === 1 ? "" : "s"} in the library.`;

    return (
        <div className="admin-recipes">
            <div className="ar-head">
                <p style={kicker}>Content</p>
                <h1 style={h1}>Articles</h1>
                <p className="ar-dek">{countLabel}</p>
            </div>

            <div className="ar-tools">
                <a href="/api/admin/articles/export" className="ar-export">⬇ Export to Excel</a>
                <ArticleImport />
            </div>

            <form className="ar-search" method="get" action="/admin/articles">
                <input type="search" name="q" defaultValue={q} placeholder="Search by title…" aria-label="Search articles by title" />
                {sort !== "default" && <input type="hidden" name="sort" value={sort} />}
                {activeCat !== "all" && <input type="hidden" name="cat" value={activeCat} />}
                {view && <input type="hidden" name="view" value={view} />}
                <button type="submit">Search</button>
                {(q || activeCat !== "all" || view) && <Link href={hrefWith({ q: "", cat: "all", view: "", page: 1 })} className="ar-clear">Clear</Link>}
            </form>

            <div className="ar-filterbar">
                <div className="ar-pills">
                    <span className="ar-pills-label">Filter</span>
                    <Link href={hrefWith({ cat: "all", q: "", view: "", page: 1 })} className={`ar-pill${activeCat === "all" && !view ? " active" : ""}`}>All</Link>
                    {ARTICLE_CATEGORIES.map((c) => {
                        const slug = slugify(c.value);
                        const isActive = !q && !view && slug === activeCat;
                        return (
                            <Link key={c.value} href={hrefWith({ cat: slug, q: "", view: "", page: 1 })} className={`ar-pill${isActive ? " active" : ""}`}>{c.label}</Link>
                        );
                    })}
                </div>
                <div className="ar-views">
                    <span className="ar-views-label">View</span>
                    <Link
                        href={hrefWith({ view: view === "hidden" ? "" : "hidden", cat: "all", q: "", page: 1 })}
                        className={`ar-sortbtn${view === "hidden" ? " active" : ""}`}
                    >
                        Hidden ({hiddenCount})
                    </Link>
                    <Link
                        href={hrefWith({ view: view === "dupes" ? "" : "dupes", cat: "all", q: "", page: 1 })}
                        className={`ar-sortbtn${view === "dupes" ? " active" : ""}`}
                    >
                        Duplicates ({dupeCount})
                    </Link>
                </div>
            </div>

            {view !== "dupes" && (
                <div className="ar-filterbar ar-filterbar-sort">
                    <span />
                    <div className="ar-sort">
                        <span className="ar-sort-label">Sort</span>
                        <Link href={hrefWith({ sort: sort === "newest" ? "default" : "newest" })} className={`ar-sortbtn${sort === "newest" ? " active" : ""}`}>Newest</Link>
                        <Link href={hrefWith({ sort: sort === "oldest" ? "default" : "oldest" })} className={`ar-sortbtn${sort === "oldest" ? " active" : ""}`}>Oldest</Link>
                    </div>
                </div>
            )}

            <p className="ar-count">{total === 0 ? "No matches." : `Showing ${from}–${to} of ${total}`}</p>

            {view === "dupes" && total > 0 && (
                <p className="ar-dupe-note">
                    Showing only duplicate copies — the oldest article in each set is treated as the original and kept out of this list.
                    Selecting all and deleting prunes the copies and leaves one of each.
                </p>
            )}

            <ArticleAdminList
                articles={articles.map((a) => ({
                    slug: a.slug,
                    title: a.title,
                    sourceUrl: a.sourceUrl,
                    date: a.date,
                    image: a.image,
                    hidden: a.hidden,
                    category: a.category,
                    tags: a.tags,
                }))}
                allMatchingSlugs={allMatchingSlugs}
            />

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