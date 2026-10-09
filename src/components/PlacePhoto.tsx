"use client";

import { useState } from "react";
import { hidePlacePhoto } from "@/lib/actions/place-photos";

// The photo layer over a place card's gradient placeholder. Prefers our stored
// free photo (website image or Mapillary street view, see place-photo-sources.ts)
// with its credit; otherwise, when Google photos are enabled, the proxied Google
// photo. On any load error it removes itself so the gradient shows through.
// Admins get a "Hide photo" button that blocks a bad photo and queues the next
// candidate.
export default function PlacePhoto({
    place,
    google = false,
    isAdmin = false,
    w = 640,
}: {
    place: { id: string; name: string; photoUrl: string | null; photoCredit: string | null };
    google?: boolean;
    isAdmin?: boolean;
    w?: number;
}) {
    const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
    const [hidden, setHidden] = useState(false);
    const [busy, setBusy] = useState(false);
    if (state === "fail" || hidden) return null;

    if (place.photoUrl) {
        const hide = async (e: React.MouseEvent) => {
            // The card itself is often a link: don't navigate.
            e.preventDefault();
            e.stopPropagation();
            if (!confirm(`Hide this photo of ${place.name}? We'll try a different one.`)) return;
            setBusy(true);
            const res = await hidePlacePhoto(place.id).catch(() => ({ ok: false }));
            setBusy(false);
            if (res.ok) setHidden(true);
            else alert("Couldn't hide the photo.");
        };
        return (
            <>
                {/* eslint-disable-next-line @next/next/no-img-element -- CDN image, already sized */}
                <img
                    src={place.photoUrl}
                    alt={place.name}
                    loading="lazy"
                    className="place-photo-img"
                    onLoad={() => setState("ok")}
                    onError={() => setState("fail")}
                />
                {state === "ok" && place.photoCredit && <span className="place-photo-cred">{place.photoCredit}</span>}
                {isAdmin && (
                    <button type="button" className="place-photo-hide" onClick={hide} disabled={busy} title="Admin: hide this photo">
                        {busy ? "Hiding…" : "Hide photo"}
                    </button>
                )}
            </>
        );
    }

    if (!google) return null;
    return (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={`/api/place-photo?id=${encodeURIComponent(place.id)}&w=${w}`}
                alt={place.name}
                loading="lazy"
                className="place-photo-img"
                onLoad={() => setState("ok")}
                onError={() => setState("fail")}
            />
            {state === "ok" && <span className="place-photo-cred">Google</span>}
        </>
    );
}
