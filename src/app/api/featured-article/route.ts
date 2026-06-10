// src/app/api/featured-article/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Don't cache — we want a fresh random pick on each load, mirroring /api/featured-recipe.
export const dynamic = "force-dynamic";

export async function GET() {
    // Prefer a visible article that has an image (the feature card looks better with one),
    // but fall back to any visible article if none have images.
    let where: { hidden: boolean; image?: { not: null } } = { hidden: false, image: { not: null } };
    let count = await prisma.article.count({ where });
    if (count === 0) {
        where = { hidden: false };
        count = await prisma.article.count({ where });
    }
    if (count === 0) return NextResponse.json(null);

    const skip = Math.floor(Math.random() * count);
    const a = await prisma.article.findFirst({
        where,
        skip,
        select: { slug: true, title: true, image: true },
    });
    if (!a) return NextResponse.json(null);

    return NextResponse.json({ slug: a.slug, title: a.title, image: a.image });
}