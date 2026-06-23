// src/lib/og.tsx
//
// Shared renderer for dynamically generated Open Graph cards (1200×630).
// Each `opengraph-image.tsx` route imports `ogImage()` and re-exports the
// size/contentType constants. Kept text-only (no remote fonts/images) so cards
// render fast at build/ISR time and never depend on NEXT_PUBLIC_MEDIA_BASE_URL.
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

type CardOpts = {
    /** Small uppercase eyebrow, e.g. "Recipe" / "Health" / "News". */
    kicker?: string;
    /** The headline — usually the post/recipe title. */
    title: string;
};

// Brand-ish palette pulled from the site (dark green field, soft green accent).
const BG = "linear-gradient(135deg, #14210f 0%, #1f3318 55%, #0e1a09 100%)";
const ACCENT = "#A7D98C";

function clamp(title: string, max = 110): string {
    const t = title.trim();
    return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** Render the branded card to a PNG ImageResponse. */
export function ogImage({ kicker, title }: CardOpts): ImageResponse {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "80px",
                    backgroundImage: BG,
                    color: "#ffffff",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: 6, color: ACCENT, textTransform: "uppercase" }}>
                    {kicker || SITE_NAME}
                </div>
                <div style={{ display: "flex", fontSize: 70, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>
                    {clamp(title)}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 30 }}>
                    <span style={{ display: "flex", fontWeight: 700 }}>{SITE_NAME}</span>
                    <span style={{ display: "flex", color: "rgba(255,255,255,0.7)" }}>{SITE_TAGLINE}</span>
                </div>
            </div>
        ),
        { ...OG_SIZE },
    );
}
