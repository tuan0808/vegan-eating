// src/app/recipes/random/route.ts
import { NextResponse } from "next/server";
import { randomRecipes } from "@/lib/recipes";

// always pick fresh on each hit
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const [r] = await randomRecipes(1);
    const dest = r ? `/recipes/${r.slug}` : "/recipes";
    return NextResponse.redirect(new URL(dest, req.url));
}