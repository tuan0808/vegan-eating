// src/app/api/kitchen/saved/route.ts
import { auth } from "@/auth";
import { savedRecipeIds } from "@/lib/kitchen";

// Per-request: depends on the session, never cached.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const recipeId = new URL(req.url).searchParams.get("recipeId");
    if (!recipeId) return Response.json({ saved: false });

    const session = await auth();
    const userId = session?.user?.id ?? null;
    if (!userId) return Response.json({ saved: false });

    const set = await savedRecipeIds(userId, [recipeId]);
    return Response.json({ saved: set.has(recipeId) });
}