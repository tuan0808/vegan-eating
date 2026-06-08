// src/app/recipes/page.tsx
import Link from "next/link";
import RecipeCard from "@/components/RecipeCard";
import Pagination from "@/components/Pagination";
import { listRecipes } from "@/lib/recipes";
import { pills } from "@/data/site";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "All recipes — vegan eating", description: "Browse every tested plant-based recipe." };

// "Salads & bowls" -> "salads-bowls", "30 minutes" -> "30-minutes", "All" -> "all"
function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ---- Pill -> filter mapping ----------------------------------------------
// Category pills match against each recipe's `courses` (and `recipeType`) text.
// These keywords are GUESSES based on common WordPress taxonomies — edit them
// to match whatever your imported `courses`/`recipeType` values actually say.
// (Run scripts/inspect-taxonomy.mjs to see your real values.)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    breakfast: ["breakfast", "brunch"],
    mains: ["main", "dinner", "entree"],
    baking: ["bak", "bread", "loaf"],
    "salads-bowls": ["salad", "bowl"],
    desserts: ["dessert", "sweet", "pudding"],
};

function catFilter(slug?: string): Prisma.RecipeWhereInput {
    if (!slug || slug === "all") return {};
    if (slug === "30-minutes") return { readyIn: { lte: 30 } }; // assumes readyIn is a numeric (minutes) column
    const kws = CATEGORY_KEYWORDS[slug];
    if (!kws) return {};
    const OR: Prisma.RecipeWhereInput[] = [];
    kws.forEach((k) => {
        OR.push({ courses: { contains: k } });
        OR.push({ recipeType: { contains: k } });
    });
    return { OR };
}

// Free-text search across title / description / ingredients.
// NOTE: SQLite `contains` is case-sensitive in Prisma, so "Tofu" and "tofu"
// differ. Good enough for now; revisit when you move to Postgres (which
// supports mode: "insensitive").
function searchFilter(q: string): Prisma.RecipeWhereInput {
    if (!q) return {};
    return { OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { ingredients: { contains: q } },
        ] };
}

function buildWhere(cat?: string, q?: string): Prisma.RecipeWhereInput {
    const conditions: Prisma.RecipeWhereInput[] = [];
    const c = catFilter(cat);
    if (Object.keys(c).length) conditions.push(c);
    if (q) conditions.push(searchFilter(q));
    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { AND: conditions };
}

export default async function RecipesPage({ searchParams }: { searchParams: { page?: string; cat?: string; q?: string } }) {
    const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
    const activeCat = searchParams.cat || "all";
    const q = (searchParams.q || "").trim();
    const { items, total, totalPages } = await listRecipes(page, 12, buildWhere(searchParams.cat, q));

    return (
        <>
            <section className="recipe-hero">
                <div className="hero-bg">
                    {/* Placeholder colour for now — swap this <div> for an <Image fill> later. */}
                    <div className="ph p3" />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,30,20,.35), rgba(20,30,20,.60))" }} />
                </div>
                <span className="hero-photo-note">Your hero photo here</span>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    {q ? (
                        <>
                            <span className="kicker" style={{ color: "#A7D98C" }}>Search results</span>
                            <h1 style={{ marginTop: 12, maxWidth: 760 }}>&ldquo;{q}&rdquo;</h1>
                            <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>
                                {total.toLocaleString()} {total === 1 ? "recipe" : "recipes"} found. <Link href="/recipes" style={{ color: "#fff", textDecoration: "underline" }}>Clear search</Link>
                            </p>
                        </>
                    ) : (
                        <>
                            <span className="kicker" style={{ color: "#A7D98C" }}>The recipe index</span>
                            <h1 style={{ marginTop: 12, maxWidth: 760 }}>{total.toLocaleString()} recipes, all tested</h1>
                            <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>
                                Cooked and re-cooked in a real kitchen before they go live. Page {page} of {totalPages}.
                            </p>
                        </>
                    )}
                </div>
            </section>

            <div className="cats" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="wrap">
                    <span className="label">Filter</span>
                    {pills.map((p) => {
                        const slug = slugify(p);
                        const isActive = !q && slug === activeCat;
                        const href = slug === "all" ? "/recipes" : `/recipes?cat=${slug}`;
                        return <Link key={p} href={href} className={`pill${isActive ? " active" : ""}`}>{p}</Link>;
                    })}
                </div>
            </div>

            <div className="wrap">
                <section>
                    {items.length > 0 ? (
                        <>
                            <div className="grid">{items.map((r) => <RecipeCard key={r.slug} r={r} />)}</div>
                            <Pagination page={page} totalPages={totalPages} basePath="/recipes" params={{ cat: searchParams.cat, q: q || undefined }} />
                        </>
                    ) : (
                        <p style={{ textAlign: "center", color: "var(--muted)", padding: "60px 0" }}>
                            {q
                                ? <>No recipes match &ldquo;{q}&rdquo;. <Link href="/recipes" style={{ color: "var(--terra)" }}>Clear search</Link></>
                                : <>No recipes match this filter yet. <Link href="/recipes" style={{ color: "var(--terra)" }}>Clear filter</Link></>}
                        </p>
                    )}
                </section>
            </div>
        </>
    );
}