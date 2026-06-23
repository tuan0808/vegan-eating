// Per-recipe Open Graph card. Renders the recipe title onto the brand card.
import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getRecipeBySlug } from "@/lib/recipes";

export const runtime = "nodejs";
export const alt = "vegan eating — recipe";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: { slug: string } }) {
    const r = await getRecipeBySlug(params.slug);
    return ogImage({ kicker: r?.recipeType || "Recipe", title: r?.title || "vegan eating" });
}
