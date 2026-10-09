// src/app/(site)/vegan-friendly-cities/page.tsx
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import CityCard from "@/components/CityCard";
import { popularCities } from "@/lib/actions/places";
import { TOP_CITIES, withCityImages } from "@/lib/city-images";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({
    path: "/vegan-friendly-cities",
    title: "Top Vegan Friendly Cities — where to eat plant-based",
    description:
        "Explore the most vegan-friendly cities in our directory, ranked by how many vegan and vegan-friendly spots they have. Tap a city to find restaurants, cafés and stores near you.",
});

export default async function VeganFriendlyCitiesPage() {
    const cities = await withCityImages(await popularCities(TOP_CITIES));

    return (
        <>
            <PageHero
                image="/header/directory.jpg"
                kicker="Where to eat"
                title="Top Vegan Friendly Cities"
                dek="The cities with the most vegan and vegan-friendly spots in our directory. Pick one to jump straight into the map."
            />

            <div className="wrap">
                <section>
                    {cities.length > 0 ? (
                        <div className="grid">
                            {cities.map((c, i) => (
                                <CityCard key={`${c.citySlug}-${c.country}`} city={c} index={i} />
                            ))}
                        </div>
                    ) : (
                        <p className="nm-empty">No cities to show yet — check back soon.</p>
                    )}
                </section>
            </div>
        </>
    );
}
