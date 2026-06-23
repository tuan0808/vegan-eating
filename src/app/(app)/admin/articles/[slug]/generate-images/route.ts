// src/app/api/admin/articles/[slug]/generate-images/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
    generateArticleImageSet,
    extractArticleSubtitles,
    estimateArticleImageCount,
} from "@/lib/article-image-pipeline";
import type { ImageQuality } from "@/lib/openai-images";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 600;

// Streams NDJSON progress as each image lands. On completion it writes the
// generated hero to `imagePending` (you "Set as hero" when ready) and the section
// images to `sectionImages` (the draggable gallery). It never touches `body`,
// `image`, or `gallery`, so it can't clobber the editor or your hero.
export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ slug: string }> }) {
    const params = await paramsP;
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return new Response("Forbidden", { status: 403 });
    }

    const slug = params.slug;
    if (!slug) return new Response("Missing slug", { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const quality: ImageQuality =
        body?.quality === "low" || body?.quality === "high" ? body.quality : "medium";
    const referenceMode: "generate" | "existing" =
        body?.referenceMode === "existing" ? "existing" : "generate";

    const article = await prisma.article.findUnique({ where: { slug } });
    if (!article) return new Response("Article not found", { status: 404 });
    if (referenceMode === "existing" && !article.image) {
        return new Response("No current hero to use as a reference", { status: 400 });
    }

    const subtitles = extractArticleSubtitles(article.body);
    if (subtitles.length === 0 && referenceMode === "existing") {
        return new Response("No subtitles found in the article body", { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (obj: unknown) => {
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
                } catch {
                    /* client disconnected */
                }
            };
            try {
                const est = estimateArticleImageCount(article.body);
                const total = referenceMode === "existing" ? est.sections : est.total;
                send({ type: "start", total, sections: est.sections });

                const set = await generateArticleImageSet(
                    { slug: article.slug, title: article.title, subtitles },
                    { quality, onProgress: (ev) => send(ev), signal: req.signal, referenceMode, existingImageUrl: article.image }
                );

                await prisma.article.update({
                    where: { slug },
                    data: {
                        // hero stays pending until you click "Set as hero"; null in existing mode
                        ...(set.heroUrl ? { imagePending: set.heroUrl } : {}),
                        sectionImages: JSON.stringify(set.sectionUrls),
                    },
                });

                send({
                    type: "done",
                    heroUrl: set.heroUrl,
                    sectionUrls: set.sectionUrls,
                    imagesGenerated: set.imagesGenerated,
                    failed: set.failed,
                    estimatedCostUsd: set.estimatedCostUsd,
                });
            } catch (err: any) {
                const aborted = err?.name === "AbortError" || req.signal.aborted;
                send({ type: aborted ? "cancelled" : "error", message: aborted ? "Cancelled." : err?.message || "Generation failed" });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            "X-Accel-Buffering": "no",
        },
    });
}