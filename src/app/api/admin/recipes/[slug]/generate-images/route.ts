// src/app/api/admin/recipes/[slug]/generate-images/route.ts
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
    generateRecipeImageSet,
    estimateImageCount,
} from "@/lib/recipe-image-pipeline";
import type { ImageQuality } from "@/lib/openai-images";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // needs the OpenAI/AWS SDKs + Buffers — not edge
export const maxDuration = 600; // seconds; honored on platforms that read it (harmless elsewhere)

// Streams newline-delimited JSON (NDJSON) progress events as each image lands.
// The continuous byte flow also keeps the connection alive past proxy idle
// timeouts, which a silent 2-minute server action would trip.
export async function POST(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    // ---- auth (same pattern as /api/upload: auth() + manual 403, since a
    // redirect thrown inside a route handler does not return cleanly) ----
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return new Response("Forbidden", { status: 403 });
    }

    const slug = params.slug;
    if (!slug) return new Response("Missing slug", { status: 400 });

    const body = await req.json().catch(() => ({} as any));
    const quality: ImageQuality =
        body?.quality === "low" || body?.quality === "high" ? body.quality : "medium";
    const force = !!body?.force;
    const referenceMode: "generate" | "existing" =
        body?.referenceMode === "existing" ? "existing" : "generate";

    const recipe = await prisma.recipe.findUnique({ where: { slug } });
    if (!recipe) return new Response("Recipe not found", { status: 404 });

    const hasPending =
        !!recipe.imagePending ||
        (recipe.stepImagesPending && recipe.stepImagesPending !== "[]");
    if (hasPending && !force) {
        return new Response(JSON.stringify({ error: "pending-exists" }), {
            status: 409,
            headers: { "Content-Type": "application/json" },
        });
    }
    if (referenceMode === "existing" && !recipe.image) {
        return new Response("No current image to use as a reference", { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (obj: unknown) => {
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
                } catch {
                    /* client disconnected — controller already closed */
                }
            };
            try {
                const est = estimateImageCount(recipe.steps);
                const total = referenceMode === "existing" ? est.steps : est.total;
                send({ type: "start", total, steps: est.steps });

                const set = await generateRecipeImageSet(
                    {
                        slug: recipe.slug,
                        title: recipe.title,
                        ingredients: recipe.ingredients,
                        steps: recipe.steps,
                    },
                    {
                        quality,
                        onProgress: (ev) => send(ev),
                        signal: req.signal,
                        referenceMode,
                        existingImageUrl: recipe.image,
                    }
                );

                await prisma.recipe.update({
                    where: { slug },
                    data: {
                        imagePending: set.heroUrl,
                        stepImagesPending: JSON.stringify(set.stepUrls),
                    },
                });

                send({
                    type: "done",
                    heroUrl: set.heroUrl, // null in "existing" mode
                    stepUrls: set.stepUrls,
                    imagesGenerated: set.imagesGenerated,
                    failed: set.failed,
                    estimatedCostUsd: set.estimatedCostUsd,
                });
            } catch (err: any) {
                const aborted = err?.name === "AbortError" || req.signal.aborted;
                send({
                    type: aborted ? "cancelled" : "error",
                    message: aborted ? "Cancelled." : err?.message || "Generation failed",
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-store, no-transform",
            "X-Accel-Buffering": "no", // ask nginx-style proxies not to buffer the stream
        },
    });
}