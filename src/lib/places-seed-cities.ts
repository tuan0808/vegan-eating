// src/lib/places-seed-cities.ts
//
// Launch geography for the Place dataset: UK, US and EU metros, where OSM's
// diet:* tagging is genuinely dense. Everything outside this list still gets
// picked up — a user searching an unfetched area queues its cells and the sync
// route fills them in — this is just what we pre-warm so launch day isn't empty.
//
// `radiusKm` is the pre-warm radius around the centre point, sized roughly to
// each city's built-up area. Bigger radius = more cells = more Overpass calls,
// so keep it tight; the background drain handles the sprawl.

export type SeedCity = {
    slug: string;
    name: string;
    region: string;
    country: string; // ISO-3166-1 alpha-2, lowercase
    lat: number;
    lng: number;
    radiusKm: number;
};

export const SEED_CITIES: SeedCity[] = [
    // --- United Kingdom & Ireland ---
    { slug: "london", name: "London", region: "England", country: "gb", lat: 51.5074, lng: -0.1278, radiusKm: 20 },
    { slug: "manchester", name: "Manchester", region: "England", country: "gb", lat: 53.4808, lng: -2.2426, radiusKm: 10 },
    { slug: "birmingham", name: "Birmingham", region: "England", country: "gb", lat: 52.4862, lng: -1.8904, radiusKm: 10 },
    { slug: "leeds", name: "Leeds", region: "England", country: "gb", lat: 53.8008, lng: -1.5491, radiusKm: 10 },
    { slug: "liverpool", name: "Liverpool", region: "England", country: "gb", lat: 53.4084, lng: -2.9916, radiusKm: 10 },
    { slug: "bristol", name: "Bristol", region: "England", country: "gb", lat: 51.4545, lng: -2.5879, radiusKm: 10 },
    { slug: "brighton", name: "Brighton", region: "England", country: "gb", lat: 50.8225, lng: -0.1372, radiusKm: 8 },
    { slug: "glasgow", name: "Glasgow", region: "Scotland", country: "gb", lat: 55.8642, lng: -4.2518, radiusKm: 10 },
    { slug: "edinburgh", name: "Edinburgh", region: "Scotland", country: "gb", lat: 55.9533, lng: -3.1883, radiusKm: 10 },
    { slug: "cardiff", name: "Cardiff", region: "Wales", country: "gb", lat: 51.4816, lng: -3.1791, radiusKm: 8 },
    { slug: "dublin", name: "Dublin", region: "Leinster", country: "ie", lat: 53.3498, lng: -6.2603, radiusKm: 10 },

    // --- United States ---
    { slug: "new-york", name: "New York", region: "New York", country: "us", lat: 40.7128, lng: -74.006, radiusKm: 20 },
    { slug: "los-angeles", name: "Los Angeles", region: "California", country: "us", lat: 34.0522, lng: -118.2437, radiusKm: 25 },
    { slug: "san-francisco", name: "San Francisco", region: "California", country: "us", lat: 37.7749, lng: -122.4194, radiusKm: 12 },
    { slug: "san-diego", name: "San Diego", region: "California", country: "us", lat: 32.7157, lng: -117.1611, radiusKm: 12 },
    { slug: "portland", name: "Portland", region: "Oregon", country: "us", lat: 45.5152, lng: -122.6784, radiusKm: 12 },
    { slug: "seattle", name: "Seattle", region: "Washington", country: "us", lat: 47.6062, lng: -122.3321, radiusKm: 12 },
    { slug: "chicago", name: "Chicago", region: "Illinois", country: "us", lat: 41.8781, lng: -87.6298, radiusKm: 15 },
    { slug: "austin", name: "Austin", region: "Texas", country: "us", lat: 30.2672, lng: -97.7431, radiusKm: 12 },
    { slug: "denver", name: "Denver", region: "Colorado", country: "us", lat: 39.7392, lng: -104.9903, radiusKm: 12 },
    { slug: "philadelphia", name: "Philadelphia", region: "Pennsylvania", country: "us", lat: 39.9526, lng: -75.1652, radiusKm: 12 },
    { slug: "boston", name: "Boston", region: "Massachusetts", country: "us", lat: 42.3601, lng: -71.0589, radiusKm: 12 },
    { slug: "washington-dc", name: "Washington", region: "District of Columbia", country: "us", lat: 38.9072, lng: -77.0369, radiusKm: 12 },
    { slug: "miami", name: "Miami", region: "Florida", country: "us", lat: 25.7617, lng: -80.1918, radiusKm: 12 },
    { slug: "atlanta", name: "Atlanta", region: "Georgia", country: "us", lat: 33.749, lng: -84.388, radiusKm: 12 },
    { slug: "las-vegas", name: "Las Vegas", region: "Nevada", country: "us", lat: 36.1699, lng: -115.1398, radiusKm: 12 },
    { slug: "phoenix", name: "Phoenix", region: "Arizona", country: "us", lat: 33.4484, lng: -112.074, radiusKm: 12 },
    { slug: "minneapolis", name: "Minneapolis", region: "Minnesota", country: "us", lat: 44.9778, lng: -93.265, radiusKm: 12 },
    { slug: "new-orleans", name: "New Orleans", region: "Louisiana", country: "us", lat: 29.9511, lng: -90.0715, radiusKm: 10 },

    // --- Europe ---
    { slug: "berlin", name: "Berlin", region: "Berlin", country: "de", lat: 52.52, lng: 13.405, radiusKm: 15 },
    { slug: "hamburg", name: "Hamburg", region: "Hamburg", country: "de", lat: 53.5511, lng: 9.9937, radiusKm: 12 },
    { slug: "munich", name: "Munich", region: "Bavaria", country: "de", lat: 48.1351, lng: 11.582, radiusKm: 12 },
    { slug: "cologne", name: "Cologne", region: "North Rhine-Westphalia", country: "de", lat: 50.9375, lng: 6.9603, radiusKm: 10 },
    { slug: "frankfurt", name: "Frankfurt", region: "Hesse", country: "de", lat: 50.1109, lng: 8.6821, radiusKm: 10 },
    { slug: "leipzig", name: "Leipzig", region: "Saxony", country: "de", lat: 51.3397, lng: 12.3731, radiusKm: 10 },
    { slug: "paris", name: "Paris", region: "Ile-de-France", country: "fr", lat: 48.8566, lng: 2.3522, radiusKm: 15 },
    { slug: "lyon", name: "Lyon", region: "Auvergne-Rhone-Alpes", country: "fr", lat: 45.764, lng: 4.8357, radiusKm: 10 },
    { slug: "marseille", name: "Marseille", region: "Provence-Alpes-Cote d'Azur", country: "fr", lat: 43.2965, lng: 5.3698, radiusKm: 10 },
    { slug: "amsterdam", name: "Amsterdam", region: "North Holland", country: "nl", lat: 52.3676, lng: 4.9041, radiusKm: 12 },
    { slug: "rotterdam", name: "Rotterdam", region: "South Holland", country: "nl", lat: 51.9244, lng: 4.4777, radiusKm: 10 },
    { slug: "brussels", name: "Brussels", region: "Brussels-Capital", country: "be", lat: 50.8503, lng: 4.3517, radiusKm: 10 },
    { slug: "barcelona", name: "Barcelona", region: "Catalonia", country: "es", lat: 41.3851, lng: 2.1734, radiusKm: 12 },
    { slug: "madrid", name: "Madrid", region: "Community of Madrid", country: "es", lat: 40.4168, lng: -3.7038, radiusKm: 12 },
    { slug: "valencia", name: "Valencia", region: "Valencian Community", country: "es", lat: 39.4699, lng: -0.3763, radiusKm: 10 },
    { slug: "lisbon", name: "Lisbon", region: "Lisbon", country: "pt", lat: 38.7223, lng: -9.1393, radiusKm: 10 },
    { slug: "porto", name: "Porto", region: "Porto", country: "pt", lat: 41.1579, lng: -8.6291, radiusKm: 10 },
    { slug: "rome", name: "Rome", region: "Lazio", country: "it", lat: 41.9028, lng: 12.4964, radiusKm: 12 },
    { slug: "milan", name: "Milan", region: "Lombardy", country: "it", lat: 45.4642, lng: 9.19, radiusKm: 12 },
    { slug: "vienna", name: "Vienna", region: "Vienna", country: "at", lat: 48.2082, lng: 16.3738, radiusKm: 12 },
    { slug: "prague", name: "Prague", region: "Prague", country: "cz", lat: 50.0755, lng: 14.4378, radiusKm: 10 },
    { slug: "warsaw", name: "Warsaw", region: "Masovia", country: "pl", lat: 52.2297, lng: 21.0122, radiusKm: 12 },
    { slug: "krakow", name: "Krakow", region: "Lesser Poland", country: "pl", lat: 50.0647, lng: 19.945, radiusKm: 10 },
    { slug: "budapest", name: "Budapest", region: "Budapest", country: "hu", lat: 47.4979, lng: 19.0402, radiusKm: 12 },
    { slug: "copenhagen", name: "Copenhagen", region: "Capital Region", country: "dk", lat: 55.6761, lng: 12.5683, radiusKm: 10 },
    { slug: "stockholm", name: "Stockholm", region: "Stockholm", country: "se", lat: 59.3293, lng: 18.0686, radiusKm: 12 },
    { slug: "oslo", name: "Oslo", region: "Oslo", country: "no", lat: 59.9139, lng: 10.7522, radiusKm: 10 },
    { slug: "helsinki", name: "Helsinki", region: "Uusimaa", country: "fi", lat: 60.1699, lng: 24.9384, radiusKm: 10 },
    { slug: "zurich", name: "Zurich", region: "Zurich", country: "ch", lat: 47.3769, lng: 8.5417, radiusKm: 10 },
    { slug: "athens", name: "Athens", region: "Attica", country: "gr", lat: 37.9838, lng: 23.7275, radiusKm: 10 },
];

export function seedCityBySlug(slug: string): SeedCity | undefined {
    return SEED_CITIES.find((c) => c.slug === slug);
}

/**
 * The seed city whose centre is nearest a point, within `maxKm`. Gives an
 * ingested cell its city/region/country when the POI's own addr:* tags are
 * missing, which is most of the time — OSM POIs almost never carry addr:country.
 */
export function nearestSeedCity(lat: number, lng: number, maxKm = 40): SeedCity | undefined {
    let best: SeedCity | undefined;
    let bestKm = Infinity;
    for (const c of SEED_CITIES) {
        // Cheap equirectangular approximation — we only need a ranking here.
        const dLat = (c.lat - lat) * 111.32;
        const dLng = (c.lng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
        const km = Math.sqrt(dLat * dLat + dLng * dLng);
        if (km < bestKm) {
            bestKm = km;
            best = c;
        }
    }
    return bestKm <= maxKm ? best : undefined;
}
