// src/app/api/articles/[slug]/view/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recordMemberView, viewSummary } from "@/lib/views";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { slug: string } }) {
    const slug = params?.slug;
    if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });
    try {
        const a = await prisma.article.update({
            where: { slug },
            data: { views: { increment: 1 } },
            select: { id: true },
        });
        const itemId = String(a.id);
        const session = await auth();
        await recordMemberView("article", itemId, session?.user);
        const summary = await viewSummary("article", itemId);
        return NextResponse.json(summary);
    } catch {
        return NextResponse.json({ error: "article not found" }, { status: 404 });
    }
}