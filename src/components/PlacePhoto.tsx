"use client";

import { useState } from "react";

// Overlays a Google Places photo on top of a card's gradient placeholder. On
// any load error (no match / 404 from the proxy) it removes itself so the
// gradient shows through. Google attribution is shown only once a photo has
// actually loaded, per their terms.
export default function PlacePhoto({ placeId, alt, w = 640 }: { placeId: string; alt: string; w?: number }) {
    const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
    if (state === "fail") return null;
    return (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={`/api/place-photo?id=${encodeURIComponent(placeId)}&w=${w}`}
                alt={alt}
                loading="lazy"
                className="place-photo-img"
                onLoad={() => setState("ok")}
                onError={() => setState("fail")}
            />
            {state === "ok" && <span className="place-photo-cred">Google</span>}
        </>
    );
}
