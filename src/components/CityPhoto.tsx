"use client";

import { useState } from "react";

// Overlays a Google Places city photo on top of a CityCard's gradient
// placeholder. On any load error (no key / no match / 404 from the proxy) it
// removes itself so the gradient + city initial show through. Google
// attribution appears only once a photo has actually loaded, per their terms.
export default function CityPhoto({
    slug,
    country,
    name,
    lat,
    lng,
    w = 640,
}: {
    slug: string;
    country: string;
    name: string;
    lat: number;
    lng: number;
    w?: number;
}) {
    const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
    if (state === "fail") return null;
    const src = `/api/city-photo?slug=${encodeURIComponent(slug)}&country=${encodeURIComponent(country)}&name=${encodeURIComponent(name)}&lat=${lat}&lng=${lng}&w=${w}`;
    return (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={name}
                loading="lazy"
                className="place-photo-img city-photo-img"
                onLoad={() => setState("ok")}
                onError={() => setState("fail")}
            />
            {state === "ok" && <span className="place-photo-cred">Google</span>}
        </>
    );
}
