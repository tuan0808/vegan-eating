// src/app/(app)/admin/recipes/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import "./admin-recipes.css";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function AdminRecipesPage({
                                                   searchParams,
                                               }: {
    searchParams: { q?: string; page?: string };
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const q = (searchParams?.q ?? "").trim();
    const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10) || 1);

    // NOTE: SQLite `contains` is case-sensitive (Prisma can't do mode:"insensitive" on SQLite).
    // Good enough for admin search now; becomes case-insensitive for free once we're on Postgres.
    const where = q ? { title: { contains: q } } : {};

    const [recipes, total] = await Promise.all([
        prisma.recipe.findMany({
            where,
            orderBy: { sort: "asc" },
            skip: (page - 1) * PER_PAGE,
            take: PER_PAGE,
            select: { slug: true, title: true, recipeType: true, author: true, image: true },
        }),
        prisma.recipe.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const from = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const to = Math.min(page * PER_PAGE, total);

    const pageHref = (p: number) => {
        const sp = new URLSearchParams();
        if (q) sp.set("q", q);
        if (p > 1) sp.set("page", String(p));
        const qs = sp.toString();
        return qs ? `/admin/recipes?${qs}` : "/admin/recipes";
    };

    return (
        <div className="admin-recipes">
            <div className="ar-head">
                <span className="ar-kicker">Content</span>
                <h1 className="ar-title">Recipes</h1>
                <p className="ar-dek">{total} recipe{total === 1 ? "" : "s"} in the library.</p>
            </div>

            {/* GET form — keeps search in the URL, no client JS */}
            <form className="ar-search" method="get" action="/admin/recipes">
                <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search by title…"
                    aria-label="Search recipes by title"
                />
                <button type="submit">Search</button>
                {q && <Link href="/admin/recipes" className="ar-clear">Clear</Link>}
            </form>

            <p className="ar-count">
                {total === 0 ? "No matches." : `Showing ${from}–${to} of ${total}`}
            </p>

            <div className="ar-list">
                {recipes.map((r) => (
                    <div className="ar-item" key={r.slug}>
                        <Link
                            href={`/admin/recipes/${r.slug}/edit`}
                            className="ar-rowlink"
                            aria-label={`Edit ${r.title}`}
                        />
                        <div className="ar-thumb">
                            {r.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.image} alt="" />
                            ) : (
                                <span className="ar-thumb-empty">🥕</span>
                            )}
                        </div>
                        <div className="ar-meta">
                            <span className="ar-item-title">{r.title}</span>
                            <span className="ar-item-sub">
                {r.recipeType || "—"}{r.author ? ` · ${r.author}` : ""}
              </span>
                        </div>
                        <div className="ar-item-actions">
                            <Link href={`/admin/recipes/${r.slug}/edit`} className="ar-edit">Edit</Link>
                            <Link href={`/recipes/${r.slug}`} target="_blank" className="ar-view">View ↗</Link>
                        </div>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <nav className="ar-pager" aria-label="Pagination">
                    {page > 1 ? (
                        <Link href={pageHref(page - 1)} className="ar-pagebtn">← Prev</Link>
                    ) : (
                        <span className="ar-pagebtn is-disabled">← Prev</span>
                    )}
                    <span className="ar-pageinfo">Page {page} of {totalPages}</span>
                    {page < totalPages ? (
                        <Link href={pageHref(page + 1)} className="ar-pagebtn">Next →</Link>
                    ) : (
                        <span className="ar-pagebtn is-disabled">Next →</span>
                    )}
                </nav>
            )}
        </div>
    );
}