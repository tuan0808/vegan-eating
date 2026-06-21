// src/app/(app)/admin/recipes/_actions/recipe-images.ts
"use server";

// Generation now runs through the streaming route at
//   /api/admin/recipes/[slug]/generate-images
// (so it can report progress and stay alive past idle timeouts).
// These remaining actions are all fast, so they stay as plain server actions.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma"; // ← adjust if your Prisma client lives elsewhere
import { requireUser } from "@/lib/auth-helpers";

async function requireAdmin() {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new Error("Not authorised");
}

type Result = { ok: boolean; message: string };

type CookAlong = { src: string; step: number | null };

function parseCookalong(json: string | null | undefined): CookAlong[] {
    try {
        const v = JSON.parse(json || "[]");
        if (!Array.isArray(v)) return [];
        return v
            .filter((x: any) => x && typeof x.src === "string")
            .map((x: any) => ({ src: String(x.src), step: x.step == null ? null : Number(x.step) }));
    } catch {
        return [];
    }
}

function parseStepUrls(json: string | null | undefined): string[] {
    try {
        const v = JSON.parse(json || "[]");
        return Array.isArray(v) ? v.map(String) : [];
    } catch {
        return [];
    }
}

// Promote pending -> live:
//  - new hero becomes the recipe image; the old one is saved as the backup
//  - generated step photos are merged into the cook-along system, pinned to
//    their step index, so they render beside the method AND show up in the
//    Cook-along editor where you can reassign / delete them.
//
// Merge rules: keep your manual cook-along photos; drop any prior AI step photos
// (path contains "/ai/") so re-publishing replaces rather than duplicates; and
// only assign a generated photo to a step that has no manual photo already.
export async function approvePendingImages(slug: string): Promise<Result> {
    await requireAdmin();
    if (!slug) return { ok: false, message: "Missing slug" };

    const recipe = await prisma.recipe.findUnique({ where: { slug } });
    if (!recipe) return { ok: false, message: "Recipe not found" };
    if (!recipe.imagePending && (!recipe.stepImagesPending || recipe.stepImagesPending === "[]")) {
        return { ok: false, message: "Nothing pending to approve" };
    }

    const stepUrls = parseStepUrls(recipe.stepImagesPending);

    const existing = parseCookalong(recipe.cookalong);
    const manual = existing.filter((c) => !c.src.includes("/ai/")); // keep your own photos, drop old AI ones
    const stepsWithManual = new Set(
        manual.filter((c) => c.step != null).map((c) => c.step as number)
    );

    const generated: CookAlong[] = stepUrls
        .map((src, i) => ({ src: src.trim(), step: i }))
        .filter((c) => c.src !== "" && !stepsWithManual.has(c.step as number));

    const mergedCookalong = [...manual, ...generated];

    await prisma.recipe.update({
        where: { slug },
        data: {
            imageBackup: recipe.image ?? null, // keep the old hero for swap-back
            image: recipe.imagePending ?? recipe.image,
            imagePending: null,
            stepImages: recipe.stepImagesPending || "[]", // kept as a record of the AI set
            stepImagesPending: "[]",
            cookalong: JSON.stringify(mergedCookalong),
        },
    });

    revalidatePath(`/admin/recipes/${slug}/edit`);
    revalidatePath(`/recipes/${slug}`);
    return {
        ok: true,
        message: `Published. ${generated.length} step photo(s) pinned to steps; previous hero saved as backup.`,
    };
}

export async function discardPendingImages(slug: string): Promise<Result> {
    await requireAdmin();
    if (!slug) return { ok: false, message: "Missing slug" };

    await prisma.recipe.update({
        where: { slug },
        data: { imagePending: null, stepImagesPending: "[]" },
    });

    revalidatePath(`/admin/recipes/${slug}/edit`);
    return { ok: true, message: "Pending images discarded." };
}

// Toggle the active hero with the backup.
export async function swapHero(slug: string): Promise<Result> {
    await requireAdmin();
    if (!slug) return { ok: false, message: "Missing slug" };

    const recipe = await prisma.recipe.findUnique({ where: { slug } });
    if (!recipe) return { ok: false, message: "Recipe not found" };
    if (!recipe.imageBackup) return { ok: false, message: "No backup hero to swap to" };

    await prisma.recipe.update({
        where: { slug },
        data: { image: recipe.imageBackup, imageBackup: recipe.image ?? null },
    });

    revalidatePath(`/admin/recipes/${slug}/edit`);
    revalidatePath(`/recipes/${slug}`);
    return { ok: true, message: "Swapped hero ↔ backup." };
}

// Rebuild `cookalong` from the durable `stepImages` record. Used to recover a
// recipe whose cook-along was wiped by a form Save (which overwrites cookalong
// but never touches stepImages). Same merge rules as approve: keep manual
// photos, replace prior AI ones, fill only steps without a manual photo.
export async function relinkStepImages(slug: string): Promise<Result> {
    await requireAdmin();
    if (!slug) return { ok: false, message: "Missing slug" };

    const recipe = await prisma.recipe.findUnique({ where: { slug } });
    if (!recipe) return { ok: false, message: "Recipe not found" };

    const stepUrls = parseStepUrls(recipe.stepImages);
    if (stepUrls.filter(Boolean).length === 0) {
        return { ok: false, message: "No stored AI step images to re-link." };
    }

    const existing = parseCookalong(recipe.cookalong);
    const manual = existing.filter((c) => !c.src.includes("/ai/"));
    const stepsWithManual = new Set(
        manual.filter((c) => c.step != null).map((c) => c.step as number)
    );
    const generated = stepUrls
        .map((src, i) => ({ src: src.trim(), step: i }))
        .filter((c) => c.src !== "" && !stepsWithManual.has(c.step as number));

    await prisma.recipe.update({
        where: { slug },
        data: { cookalong: JSON.stringify([...manual, ...generated]) },
    });

    revalidatePath(`/admin/recipes/${slug}/edit`);
    revalidatePath(`/recipes/${slug}`);
    return { ok: true, message: `Re-linked ${generated.length} step photo(s) to the method.` };
}