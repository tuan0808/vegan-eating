// Site-wide default Open Graph card (used by any route without its own).
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { SITE_DEFAULT_TITLE } from "@/lib/seo";

export const runtime = "nodejs";
export const alt = SITE_DEFAULT_TITLE;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
    return ogImage({ kicker: "vegan eating", title: "Tested plant-based recipes & community" });
}
