// src/app/api/featured-recipe/route.ts
import { NextResponse } from "next/server";
import { randomRecipes } from "@/lib/recipes";

export const dynamic = "force-dynamic";

function imgSrc(src?: string | null): string | null {
    if (!src) return null;
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return "/" + src.replace(/^\.?\//, "");
}

export async function GET() {
    const [r] = await randomRecipes(1);
    if (!r) return NextResponse.json(null);
    return NextResponse.json({ title: r.title, slug: r.slug, image: imgSrc(r.image) });
}