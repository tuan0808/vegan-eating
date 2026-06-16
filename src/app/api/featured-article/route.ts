// src/app/api/featured-article/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fresh random pick per request — same idea as /api/featured-recipe.
export const dynamic = "force-dynamic";

function imgSrc(src?: string | null): string | null {
    if (!src) return null;
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return "/" + src.replace(/^\.?\//, "");
}

export async function GET() {
    const where = { hidden: false };
    const total = await prisma.article.count({ where });
    if (total === 0) return NextResponse.json(null);

    // Prisma-native count + skip (Postgres-safe for the production migration),
    // selecting only what the nav feature needs.
    const skip = Math.floor(Math.random() * total);
    const a = await prisma.article.findFirst({
        where,
        skip,
        select: { title: true, slug: true, image: true },
    });
    if (!a) return NextResponse.json(null);

    return NextResponse.json({ title: a.title, slug: a.slug, image: imgSrc(a.image) });
}