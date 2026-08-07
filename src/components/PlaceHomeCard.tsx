// src/components/PlaceHomeCard.tsx
//
// A place rendered in the recipe-card visual language for the home-page
// "Vegan food near you" strip. Since OSM carries no photos, the image slot is a
// category-tinted gradient with a venue-type glyph — a clean placeholder, not a
// stand-in for a real photo. Links into the tool centred on the place.
import Link from "next/link";
import type { NearbyPlace } from "@/lib/places";
import type { PlaceCategory, PlaceType } from "@/lib/places-osm";
import PlacePhoto from "@/components/PlacePhoto";

const CAT: Record<PlaceCategory, { label: string; grad: string }> = {
    VEGAN: { label: "Fully vegan", grad: "linear-gradient(135deg,#5BB35F,#1F5E27)" },
    VEGETARIAN: { label: "Vegetarian", grad: "linear-gradient(135deg,#8FBF6A,#4B7A2F)" },
    VEG_FRIENDLY: { label: "Veg-friendly", grad: "linear-gradient(135deg,#F0A65C,#C24817)" },
};

const TYPE_LABELS: Record<PlaceType, string> = {
    RESTAURANT: "Restaurant", CAFE: "Café", FAST_FOOD: "Fast food", BAKERY: "Bakery",
    ICE_CREAM: "Ice cream", JUICE_BAR: "Juice bar", FOOD_TRUCK: "Food truck",
    BAR: "Bar", STORE: "Store", MARKET: "Market", OTHER: "Vegan spot",
};

function TypeGlyph({ type }: { type: PlaceType }) {
    // One line-art glyph per broad venue kind; sits faint over the gradient.
    const common = { width: 46, height: 46, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    switch (type) {
        case "CAFE":
        case "JUICE_BAR":
            return <svg {...common}><path d="M17 8h1a3 3 0 0 1 0 6h-1" /><path d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8Z" /><path d="M6 2v2M10 2v2M14 2v2" /></svg>;
        case "BAKERY":
            return <svg {...common}><path d="M4 13a8 5 0 0 1 16 0v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M8 13v5M12 12v6M16 13v5" /></svg>;
        case "ICE_CREAM":
            return <svg {...common}><path d="M8 10a4 4 0 0 1 8 0Z" /><path d="M8 10l4 10 4-10" /></svg>;
        case "BAR":
            return <svg {...common}><path d="M5 4h14l-7 8Z" /><path d="M12 12v6M8 20h8" /></svg>;
        case "STORE":
        case "MARKET":
            return <svg {...common}><path d="M6 8h12l-1 12H7Z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>;
        default: // restaurant / fast food / food truck / other
            return <svg {...common}><path d="M7 2v9M7 11a2 2 0 0 0 2-2V2M11 2v20M17 2c-1.5 1-2 3-2 6s.5 4 2 4v10" /></svg>;
    }
}

export default function PlaceHomeCard({ p, photos = false }: { p: NearbyPlace; photos?: boolean }) {
    const cat = CAT[p.category as PlaceCategory] ?? CAT.VEG_FRIENDLY;
    const type = p.type as PlaceType;
    const href = `/tools/vegan-food-near-me?lat=${p.lat}&lng=${p.lng}&label=${encodeURIComponent(p.city || "here")}`;
    const where = [p.city, p.region].filter(Boolean)[0] || "See on map";
    return (
        <Link href={href} className="card place-card" style={{ position: "relative", display: "block" }}>
            <div className="photo">
                <div className="ph" style={{ background: cat.grad }} />
                <span className="place-glyph">
                    <TypeGlyph type={type} />
                </span>
                {photos && <PlacePhoto placeId={p.id} alt={p.name} />}
                <span className="diet-chip">{cat.label}</span>
            </div>
            <span className="tag">{TYPE_LABELS[type] ?? "Vegan spot"}</span>
            <h3>{p.name}</h3>
            <div className="meta">
                <span>📍 {where}</span>
            </div>
        </Link>
    );
}
