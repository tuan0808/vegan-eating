// src/app/api/recipes/[slug]/view/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { recordMemberView, viewSummary } from "@/lib/views";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params: paramsP }: { params: Promise<{ slug: string }> }) {
    const params = await paramsP;
    const slug = params?.slug;
    if (!slug) return NextResponse.json({ error: "missing slug" }, { status: 400 });
    try {
        // Public total reach (everyone, incl. anonymous) — powers analytics / popularity.
        const r = await prisma.recipe.update({
            where: { slug },
            data: { views: { increment: 1 } },
            select: { id: true },
        });
        // Member identity for the hero faces (logged-in only).
        const session = await auth();
        await recordMemberView("recipe", r.id, session?.user);
        const summary = await viewSummary("recipe", r.id);
        return NextResponse.json(summary);
    } catch {
        return NextResponse.json({ error: "recipe not found" }, { status: 404 });
    }
}