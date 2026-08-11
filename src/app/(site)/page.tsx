// src/app/page.tsx
import { Hero } from "@/components/Sections";
import { Collections, ForumSection, JoinBand } from "@/components/HomeSections";
import Meditation from "@/components/Meditation";
import HomeSearch from "@/components/HomeSearch";
import HomeNearby from "@/components/HomeNearby";
import RecipeCard from "@/components/RecipeCard";
import CityCard from "@/components/CityCard";
import InstagramSection from "@/components/InstagramSection";
import { latestRecipes, randomRecipes } from "@/lib/recipes";
import { popularCities } from "@/lib/actions/places";
import { clientIp, ipLocation } from "@/lib/geo-ip";
import { photosEnabled } from "@/lib/place-photos";
import { recentInstagram } from "@/lib/instagram";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

// random picks differ per visit, so render on each request
export const dynamic = "force-dynamic";

// Home uses the site-default title; this adds the self-canonical + OG card.
export const metadata = pageMetadata({ path: "/" });

const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

function first(v: string | string[] | undefined): string {
    return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function Home({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;

    const [hero, latest, picks, cities, ig] = await Promise.all([
        randomRecipes(1),
        latestRecipes(6),
        randomRecipes(4),
        popularCities(4),
        recentInstagram(8),
    ]);

    // Seed the "near me" area from the visitor's IP so it renders local on first
    // paint. `?nlat&nlng` overrides it (handy on localhost, where there's no IP).
    const qLat = Number(first(sp.nlat));
    const qLng = Number(first(sp.nlng));
    let seed: { lat: number; lng: number; label: string } | null = null;
    if (Number.isFinite(qLat) && Number.isFinite(qLng) && qLat !== 0 && qLng !== 0) {
        seed = { lat: qLat, lng: qLng, label: first(sp.nlabel) || "you" };
    } else {
        const loc = await ipLocation(await clientIp());
        if (loc) seed = { lat: loc.lat, lng: loc.lng, label: loc.city || loc.label };
    }

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

            {/* Nearest strip + "10 best by Google rating" rail, seeded from IP. */}
            <HomeNearby seed={seed} photos={photosEnabled()} />

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

            {cities.length > 0 && (
                <div className="wrap">
                    <section style={{ paddingTop: 0 }}>
                        <div className="sec-head">
                            <div>
                                <span className="kicker" style={{ color: "var(--carrot)" }}>Where to eat</span>
                                <h2 style={{ marginTop: 10 }}>Top vegan friendly cities</h2>
                            </div>
                            <Link href="/vegan-friendly-cities">View more <Arrow /></Link>
                        </div>
                        <div className="grid">{cities.map((c, i) => <CityCard key={`${c.citySlug}-${c.country}`} city={c} index={i} />)}</div>
                    </section>
                </div>
            )}

            <JoinBand />

            <InstagramSection posts={ig} />
        </>
    );
}
