// src/app/(app)/admin/news/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import NewsRow from "./NewsRow";
import NewsSyncButton from "./NewsSyncButton";
import NewsImport from "./NewsImport";
import RescanDuplicatesButton from "./RescanDuplicatesButton";
import NewsBulkBar from "./NewsBulkBar";
import NewsQueryPanel from "./NewsQueryPanel";
import SelectionProvider from "@/components/admin/selection/SelectionProvider";
import { getNewsQueryString } from "@/lib/news-query";
import "../recipes/admin-recipes.css";
import type { Prisma } from "@prisma/client";

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
    searchParams: { q?: string; page?: string; sort?: string; cat?: string; view?: string };
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const q = (searchParams?.q ?? "").trim();
    const sort = searchParams?.sort || "newest";
    const activeCat = searchParams?.cat || "all";
    const view = searchParams?.view === "dupes" ? "dupes" : "all";
    const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);

    const orderBy: Prisma.NewsArticleOrderByWithRelationInput =
        sort === "oldest" ? { pubDate: "asc" } : { pubDate: "desc" };

    // The duplicates review queue ignores the category pills and shows every
    // flagged story so staff can clear them out; the default view keeps the
    // normal title/category filtering.
    const where: Prisma.NewsArticleWhereInput =
        view === "dupes"
            ? { dupeOf: { not: null }, ...(q ? { title: { contains: q } } : {}) }
            : {
                ...(q ? { title: { contains: q } } : {}),
                // categories is a JSON string like ["food","health"] — substring match on the quoted value.
                ...(activeCat !== "all" ? { categories: { contains: `"${activeCat}"` } } : {}),
            };

    // The duplicates review queue shows everything on one page so "select all"
    // really selects all of them; the normal view stays paginated.
    const isDupes = view === "dupes";
    const take = isDupes ? 1000 : PER_PAGE;
    const skip = isDupes ? 0 : (page - 1) * PER_PAGE;

    const [rows, total, dupeCount, newsQuery] = await Promise.all([
        prisma.newsArticle.findMany({ where, orderBy, skip, take }),
        prisma.newsArticle.count({ where }),
        prisma.newsArticle.count({ where: { dupeOf: { not: null } } }),
        getNewsQueryString(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    // Shared row shape for NewsRow, used by both the default and duplicates views.
    const items = rows.map((r) => ({
        slug: r.slug,
        title: r.title,
        source: r.source,
        date: r.pubDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        image: r.image,
        hidden: r.hidden,
        categories: parseCategories(r.categories),
        dupeOf: r.dupeOf,
    }));

    const hrefWith = (over: { q?: string; sort?: string; cat?: string; view?: string; page?: number }) => {
        const qq = over.q !== undefined ? over.q : q;
        const ss = over.sort !== undefined ? over.sort : sort;
        const cc = over.cat !== undefined ? over.cat : activeCat;
        const vv = over.view !== undefined ? over.view : view;
        const pp = over.page !== undefined ? over.page : 1;
        const sp = new URLSearchParams();
        if (qq) sp.set("q", qq);
        if (ss && ss !== "newest") sp.set("sort", ss);
        if (vv === "dupes") sp.set("view", "dupes");
        else if (cc && cc !== "all") sp.set("cat", cc); // cat is irrelevant in the dupes view
        if (pp > 1) sp.set("page", String(pp));
        const qs = sp.toString();
        return qs ? `/admin/news?${qs}` : "/admin/news";
    };

    return (
        <div className="admin-recipes">
            <div className="ar-head">
                <p style={kicker}>Content</p>
                <h1 style={h1}>News</h1>
                <p className="ar-dek">
                    {total} stor{total === 1 ? "y" : "ies"}
                    {view === "dupes" ? " flagged as duplicates." : " in the backlog."}
                    {view !== "dupes" && dupeCount > 0 ? ` ${dupeCount} flagged for review.` : ""}
                </p>
            </div>

            <div className="ar-tools">
                <NewsSyncButton />
                <a href="/api/admin/news/export" className="ar-export">⬇ Export to Excel</a>
                <NewsImport />
                <RescanDuplicatesButton />
            </div>

            <NewsQueryPanel current={newsQuery} />

            <form className="ar-search" method="get" action="/admin/news">
                <input type="search" name="q" defaultValue={q} placeholder="Search by title…" aria-label="Search news by title" />
                {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
                {view === "dupes" && <input type="hidden" name="view" value="dupes" />}
                <button type="submit">Search</button>
                {(q || activeCat !== "all" || view === "dupes") && <Link href={hrefWith({ q: "", cat: "all", view: "all", page: 1 })} className="ar-clear">Clear</Link>}
            </form>

            <div className="ar-filterbar">
                <div className="ar-pills">
                    <span className="ar-pills-label">Filter</span>
                    <Link href={hrefWith({ cat: "all", view: "all", q: "", page: 1 })} className={`ar-pill${view !== "dupes" && activeCat === "all" ? " active" : ""}`}>All</Link>
                    {NEWS_CATEGORIES.map((c) => {
                        const isActive = view !== "dupes" && !q && c.value === activeCat;
                        return (
                            <Link key={c.value} href={hrefWith({ cat: c.value, view: "all", q: "", page: 1 })} className={`ar-pill${isActive ? " active" : ""}`}>{c.label}</Link>
                        );
                    })}
                    <Link
                        href={hrefWith({ view: "dupes", q: "", page: 1 })}
                        className={`ar-pill${view === "dupes" ? " active" : ""}`}
                        style={dupeCount > 0 ? { color: "#8a5a00" } : undefined}
                    >
                        ⚑ Duplicates{dupeCount > 0 ? ` (${dupeCount})` : ""}
                    </Link>
                </div>
                <div className="ar-sort">
                    <span className="ar-sort-label">Sort</span>
                    <Link href={hrefWith({ sort: "newest", page: 1 })} className={`ar-sortbtn${sort === "newest" ? " active" : ""}`}>Newest</Link>
                    <Link href={hrefWith({ sort: "oldest", page: 1 })} className={`ar-sortbtn${sort === "oldest" ? " active" : ""}`}>Oldest</Link>
                </div>
            </div>

            <p className="ar-count">
                {total === 0 ? "No matches." : isDupes ? `${total} flagged` : `Showing ${from}–${to} of ${total}`}
            </p>

            {/* Both views now share the same selectable NewsRow list. The bulk bar
                and per-row checkboxes come from the generic selection primitive, so
                "select all + delete/hide" works everywhere — not just on duplicates. */}
            <SelectionProvider allIds={items.map((i) => i.slug)}>
                <NewsBulkBar />
                <div className="ar-list">
                    {items.map((item) => (
                        <NewsRow key={item.slug} item={item} />
                    ))}
                </div>
            </SelectionProvider>

            {!isDupes && totalPages > 1 && (
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