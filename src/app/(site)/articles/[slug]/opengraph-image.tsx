// Per-article Open Graph card. Renders the article title onto the brand card.
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getArticleBySlug } from "@/lib/articles";

export const runtime = "nodejs";
export const alt = "vegan eating — article";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params: paramsP }: { params: Promise<{ slug: string }> }) {
    const params = await paramsP;
    const a = await getArticleBySlug(params.slug);
    return ogImage({ kicker: a?.category || "Health", title: a?.title || "vegan eating" });
}
