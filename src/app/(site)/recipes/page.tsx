// src/app/(site)/recipes/page.tsx
import Link from "next/link";
import RecipeCard from "@/components/RecipeCard";
import Pagination from "@/components/Pagination";
import { listRecipes } from "@/lib/recipes";
import { slugify, buildWhere } from "@/lib/recipe-filters";
import { pills } from "@/data/site";
import PageHero from "@/components/PageHero";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
    title: "All recipes",
    description: "Browse every tested plant-based recipe — breakfasts, mains, baking, salads and more.",
    path: "/recipes",
});

export default async function RecipesPage({ searchParams }: { searchParams: { page?: string; cat?: string; q?: string } }) {
    const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
    const activeCat = searchParams.cat || "all";
    const q = (searchParams.q || "").trim();
    const { items, total, totalPages } = await listRecipes(page, 12, buildWhere(searchParams.cat, q));

    return (
        <>
            <PageHero
                image="/header/recipes.jpg"
                kicker="The Kitchen"
                title="Recipes"
                dek="Hundreds of plant-based recipes — weeknight dinners, weekend projects, and everything in between."
            />

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