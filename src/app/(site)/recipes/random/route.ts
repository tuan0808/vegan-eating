// src/app/recipes/random/route.ts
import { NextResponse } from "next/server";
import { randomRecipes } from "@/lib/recipes";

// always pick fresh on each hit
export const dynamic = "force-dynamic";

export async function GET() {
    const [r] = await randomRecipes(1);
    const dest = r ? `/recipes/${r.slug}` : "/recipes";
    // Emit a RELATIVE Location so the browser resolves it against the public URL
    // it actually requested. Building an absolute URL from `req.url` breaks behind
    // DigitalOcean's proxy, where `req.url` is the internal origin (localhost:8080)
    // — that's what was bouncing "Surprise me" to localhost. Relative sidesteps it.
    return new NextResponse(null, { status: 307, headers: { Location: dest } });
}