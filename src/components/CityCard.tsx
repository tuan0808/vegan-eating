// A city rendered in the site card language for the "Top Vegan Friendly Cities"
// rail and the /vegan-friendly-cities page. The image slot is a rotating
// gradient with the city initial, covered by the city's AI-generated image once
// one exists (see city-images.ts), else by a Google Places city photo when one
// resolves (see CityPhoto). Links into the Near Me tool centred on the city.
import Link from "next/link";
import type { CityWithImage } from "@/lib/city-images";
import CityPhoto from "@/components/CityPhoto";

// ISO-3166-1 alpha-2 -> display name for the few countries we surface most.
const COUNTRY: Record<string, string> = {
    us: "USA", gb: "UK", de: "Germany", fr: "France", es: "Spain", at: "Austria",
    nl: "Netherlands", pl: "Poland", gr: "Greece", hu: "Hungary", it: "Italy",
    ca: "Canada", au: "Australia", ie: "Ireland", pt: "Portugal", be: "Belgium",
    ch: "Switzerland", cz: "Czechia", se: "Sweden", dk: "Denmark",
};

export default function CityCard({ city, index = 0 }: { city: CityWithImage; index?: number }) {
    const href = `/tools/vegan-food-near-me?lat=${city.lat}&lng=${city.lng}&label=${encodeURIComponent(city.city)}`;
    const country = COUNTRY[city.country] ?? city.country.toUpperCase();
    const ph = `p${(index % 7) + 1}`;
    return (
        <Link href={href} className="card place-card" style={{ position: "relative", display: "block" }}>
            <div className="photo">
                <div className={`ph ${ph}`} />
                <span className="city-initial">{city.city.charAt(0)}</span>
                {city.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- CDN image, already sized
                    <img src={city.image} alt={city.city} loading="lazy" className="place-photo-img city-photo-img" />
                ) : (
                    <CityPhoto slug={city.citySlug} country={city.country} name={city.city} lat={city.lat} lng={city.lng} />
                )}
                <span className="ph-label">{country}</span>
            </div>
            <span className="tag">Vegan friendly</span>
            <h3>{city.city}</h3>
            <div className="meta">
                <span>🌱 {city.count} spots</span>
            </div>
        </Link>
    );
}
