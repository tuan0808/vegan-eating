// src/app/api/featured-news/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Picks a random story from the recent visible feed (preferring ones with a
// photo) so the News dropdown rotates on each page load. Mirrors the shape the
// Header expects: { title, slug, image }.
export async function GET() {
    const withImage = await prisma.newsArticle.findMany({
        where: { hidden: false, image: { not: null } },
        orderBy: { pubDate: "desc" },
        take: 24,
        select: { slug: true, title: true, image: true },
    });

    const list = withImage.length
        ? withImage
        : await prisma.newsArticle.findMany({
            where: { hidden: false },
            orderBy: { pubDate: "desc" },
            take: 24,
            select: { slug: true, title: true, image: true },
        });

    if (!list.length) return NextResponse.json(null);

    const pick = list[Math.floor(Math.random() * list.length)];
    return NextResponse.json({ title: pick.title, slug: pick.slug, image: pick.image });
}