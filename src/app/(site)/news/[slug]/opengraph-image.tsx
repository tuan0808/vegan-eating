// Per-news Open Graph card. Renders the story title onto the brand card.
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getNewsArticleBySlug } from "@/lib/news";

export const runtime = "nodejs";
export const alt = "vegan eating — news";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: { slug: string } }) {
    const a = await getNewsArticleBySlug(params.slug);
    return ogImage({ kicker: "News", title: a?.title || "vegan eating" });
}
