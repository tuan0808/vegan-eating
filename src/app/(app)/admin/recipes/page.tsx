// src/app/(app)/admin/recipes/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { listRecipesAdmin } from "@/lib/recipes";
import { slugify, buildWhere } from "@/lib/recipe-filters";
import { pills } from "@/data/site";
import RecipeRow from "./RecipeRow";
import RecipeImport from "./RecipeImport";
import "./admin-recipes.css";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminRecipesPage({
                                                   searchParams,
                                               }: {
    searchParams: Promise<{ q?: string; page?: string; cat?: string; sort?: string }>;
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const sp = await searchParams;
    const q = (sp?.q ?? "").trim();
    const cat = sp?.cat || "all";
    const sort = sp?.sort || "default";
    const page = Math.max(1, parseInt(sp?.page ?? "1", 10) || 1);

    // sort=newest|oldest order by date; otherwise the default seed order.
    const orderBy: Prisma.RecipeOrderByWithRelationInput =
        sort === "newest" ? { date: "desc" }
            : sort === "oldest" ? { date: "asc" }
                : { sort: "asc" };

    // listRecipesAdmin deliberately skips the public filter, so this shows
    // hidden recipes AND non-recipe junk (e.g. terms-and-conditions) too.
    const { items: recipes, total, totalPages } = await listRecipesAdmin({
        page,
        perPage: PER_PAGE,
        where: buildWhere(cat, q),
        orderBy,
    });

    const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    // One href builder so pills, sort, search-clear and pager each preserve the others.
    const hrefWith = (over: { q?: string; cat?: string; sort?: string; page?: number }) => {
        const qq = over.q !== undefined ? over.q : q;
        const cc = over.cat !== undefined ? over.cat : cat;
        const ss = over.sort !== undefined ? over.sort : sort;
        const pp = over.page !== undefined ? over.page : 1; // any control change resets to page 1 unless told otherwise
        const sp = new URLSearchParams();
        if (qq) sp.set("q", qq);
        if (cc && cc !== "all") sp.set("cat", cc);
        if (ss && ss !== "default") sp.set("sort", ss);
        if (pp > 1) sp.set("page", String(pp));
        const qs = sp.toString();
        return qs ? `/admin/recipes?${qs}` : "/admin/recipes";
    };

    return (
        <div className="admin-recipes">
            <div className="ar-head">
                <p style={kicker}>Content</p>
                <h1 style={h1}>Recipes</h1>
                <p className="ar-dek">{total} recipe{total === 1 ? "" : "s"} in the library.</p>
            </div>

            <div className="ar-tools">
                <a href="/api/admin/recipes/export" className="ar-export">⬇ Export to Excel</a>
                <RecipeImport />
            </div>

            {/* GET form — keeps search in the URL, no client JS. Preserves filter + sort. */}
            <form className="ar-search" method="get" action="/admin/recipes">
                <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search by title…"
                    aria-label="Search recipes by title"
                />
                {cat !== "all" && <input type="hidden" name="cat" value={cat} />}
                {sort !== "default" && <input type="hidden" name="sort" value={sort} />}
                <button type="submit">Search</button>
                {(q || cat !== "all") && <Link href={hrefWith({ q: "", cat: "all", page: 1 })} className="ar-clear">Clear</Link>}
            </form>

            <div className="ar-filterbar">
                {/* Filter pills — mirror the public recipes page. */}
                <div className="ar-pills">
                    <span className="ar-pills-label">Filter</span>
                    {pills.map((p) => {
                        const slug = slugify(p);
                        const isActive = !q && slug === cat;
                        const href = slug === "all"
                            ? hrefWith({ cat: "all", q: "", page: 1 })
                            : hrefWith({ cat: slug, q: "", page: 1 });
                        return (
                            <Link key={p} href={href} className={`ar-pill${isActive ? " active" : ""}`}>{p}</Link>
                        );
                    })}
                    {/* Admin-only: recipes with no category assigned yet (or missed by the bulk pass). */}
                    <Link
                        href={hrefWith({ cat: "na", q: "", page: 1 })}
                        className={`ar-pill${!q && cat === "na" ? " active" : ""}`}
                    >NA</Link>
                </div>

                {/* Sort by date — clicking the active one returns to default order. */}
                <div className="ar-sort">
                    <span className="ar-sort-label">Sort</span>
                    <Link
                        href={hrefWith({ sort: sort === "newest" ? "default" : "newest", page: 1 })}
                        className={`ar-sortbtn${sort === "newest" ? " active" : ""}`}
                    >Newest</Link>
                    <Link
                        href={hrefWith({ sort: sort === "oldest" ? "default" : "oldest", page: 1 })}
                        className={`ar-sortbtn${sort === "oldest" ? " active" : ""}`}
                    >Oldest</Link>
                </div>
            </div>

            <p className="ar-count">
                {total === 0 ? "No matches." : `Showing ${from}–${to} of ${total}`}
            </p>

            <div className="ar-list">
                {recipes.map((r) => (
                    <RecipeRow
                        key={r.slug}
                        recipe={{
                            slug: r.slug,
                            title: r.title,
                            recipeType: r.recipeType,
                            category: r.category,
                            author: r.author,
                            image: r.image,
                            hidden: r.hidden,
                            date: r.date,
                            description: r.description,
                            prepTime: r.prepTime,
                            cookTime: r.cookTime,
                            readyIn: r.readyIn,
                            servings: r.servings,
                            calories: r.calories,
                            courses: r.courses,
                            cuisines: r.cuisines,
                            allergens: r.allergens,
                            seasons: r.seasons,
                        }}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <nav className="ar-pager" aria-label="Pagination">
                    {page > 1 ? (
                        <Link href={hrefWith({ page: page - 1 })} className="ar-pagebtn">← Prev</Link>
                    ) : (
                        <span className="ar-pagebtn is-disabled">← Prev</span>
                    )}
                    <span className="ar-pageinfo">Page {page} of {totalPages}</span>
                    {page < totalPages ? (
                        <Link href={hrefWith({ page: page + 1 })} className="ar-pagebtn">Next →</Link>
                    ) : (
                        <span className="ar-pagebtn is-disabled">Next →</span>
                    )}
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