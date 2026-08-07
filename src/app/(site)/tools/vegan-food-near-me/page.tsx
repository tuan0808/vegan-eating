// src/app/(site)/tools/vegan-food-near-me/page.tsx
import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import VeganFoodNearMe from "@/components/VeganFoodNearMe";
import { popularCities } from "@/lib/actions/places";
import { clientIp, ipLocation } from "@/lib/geo-ip";
import { photosEnabled } from "@/lib/place-photos";
import "./vegan-food-near-me.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "Vegan Food Near Me — find plant-based restaurants & cafés",
    description:
        "Find vegan and vegan-friendly restaurants, cafés, bakeries and stores near you. Search by location, filter by diet and type, and get directions.",
};

function first(v: string | string[] | undefined): string {
    return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function VeganFoodNearMePage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const sp = await searchParams;

    // --- Seed location for first paint (HappyCow-style) ---
    // Override order, so the IP-seeded experience can be demoed without a public
    // IP (e.g. on localhost): explicit ?lat&lng wins, then ?ip runs the real
    // lookup, then the visitor's actual IP. Overrides only set this view's
    // default search centre — the same thing the city picker does — so they're
    // safe to leave enabled.
    const qLat = Number(first(sp.lat));
    const qLng = Number(first(sp.lng));
    const qIp = first(sp.ip);

    let initialOrigin: { lat: number; lng: number; label: string } | undefined;
    let cities: Awaited<ReturnType<typeof popularCities>>;

    if (Number.isFinite(qLat) && Number.isFinite(qLng) && qLat !== 0 && qLng !== 0) {
        initialOrigin = { lat: qLat, lng: qLng, label: first(sp.label) || "your location" };
        cities = await popularCities(12);
    } else {
        const ip = qIp || (await clientIp());
        const [c, ipLoc] = await Promise.all([popularCities(12), ipLocation(ip)]);
        cities = c;
        // Null on localhost/LAN and on any provider failure, in which case the
        // tool opens on the manual "use my location" + city picker.
        if (ipLoc) initialOrigin = { lat: ipLoc.lat, lng: ipLoc.lng, label: ipLoc.label };
    }

    return (
        <>
            <PageHero
                image="/header/directory.jpg"
                kicker="Find a spot"
                title="Vegan Food Near Me"
                dek="Restaurants, cafés, bakeries and stores with something for you — filtered to fully vegan, vegetarian, or veg-friendly, sorted nearest first."
            />

            <div className="wrap nm-wrap">
                <VeganFoodNearMe cities={cities} initialOrigin={initialOrigin} photosEnabled={photosEnabled()} />

                <p className="nm-source">
                    Place data comes from OpenStreetMap contributors and is offered as a guide — hours and menus change,
                    so it&apos;s always worth a quick check before you go.
                </p>
            </div>
        </>
    );
}
