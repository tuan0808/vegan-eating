// src/app/api/comments/route.ts
import { auth } from "@/auth";
import { getComments, getRatingSummary, type CommentTarget } from "@/lib/comments";

// Per-request: depends on the session, never cached.
export const dynamic = "force-dynamic";

// Rebuild the CommentTarget from query params. The detail pages only ever
// target a recipe (string id) or an article (numeric id); extend here if the
// comment system grows other targets.
function targetFromQuery(sp: URLSearchParams): CommentTarget | null {
    const recipeId = sp.get("recipeId");
    if (recipeId) return { recipeId } as CommentTarget;
    const articleId = sp.get("articleId");
    if (articleId) return { articleId: Number(articleId) } as CommentTarget;
    return null;
}

export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);

    const target = targetFromQuery(sp);
    if (!target) return Response.json({ error: "missing target" }, { status: 400 });

    const [data, session, rating] = await Promise.all([
        getComments(target, page),
        auth(),
        getRatingSummary(target),
    ]);

    return Response.json({
        comments: data.comments,
        total: data.total,
        totalPages: data.totalPages,
        page: data.page,
        rating,
        canComment: !!session?.user?.id,
    });
}