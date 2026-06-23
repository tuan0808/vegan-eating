// src/app/page.tsx
import { Hero } from "@/components/Sections";
import { Collections, ForumSection, JoinBand } from "@/components/HomeSections";
import Meditation from "@/components/Meditation";
import HomeSearch from "@/components/HomeSearch";
import RecipeCard from "@/components/RecipeCard";
import { latestRecipes, randomRecipes } from "@/lib/recipes";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

// random picks differ per visit, so render on each request
export const dynamic = "force-dynamic";

// Home uses the site-default title; this adds the self-canonical + OG card.
export const metadata = pageMetadata({ path: "/" });

const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export default async function Home() {
    const [hero, latest, picks] = await Promise.all([
        randomRecipes(1),
        latestRecipes(6),
        randomRecipes(4),
    ]);
    return (
        <>
            <Hero recipe={hero[0]} />

            <HomeSearch />

            <div className="wrap">
                <section>
                    <div className="sec-head">
                        <div>
                            <span className="kicker">Fresh from the kitchen</span>
                            <h2 style={{ marginTop: 10 }}>Latest recipes</h2>
                        </div>
                        <Link href="/recipes">View all recipes <Arrow /></Link>
                    </div>
                    <div className="grid">{latest.map((r) => <RecipeCard key={r.slug} r={r} />)}</div>
                </section>
            </div>

            <Collections />

            {picks.length > 0 && (
                <div className="wrap">
                    <section style={{ paddingTop: 0 }}>
                        <div className="sec-head">
                            <div>
                                <span className="kicker" style={{ color: "var(--carrot)" }}>Fresh picks</span>
                                <h2 style={{ marginTop: 10 }}>Something new to try</h2>
                            </div>
                            <Link href="/recipes">Surprise me <Arrow /></Link>
                        </div>
                        <div className="grid">{picks.map((r) => <RecipeCard key={r.slug} r={r} />)}</div>
                    </section>
                </div>
            )}

            <ForumSection />
            <Meditation />
            <JoinBand />
        </>
    );
}