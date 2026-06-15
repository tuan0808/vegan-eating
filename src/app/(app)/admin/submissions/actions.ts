// src/app/(app)/admin/submissions/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type ReviewResult = { ok: boolean; error?: string };

// dietType -> the forum the approved recipe becomes a thread in.
// NOTE: vegetarian category slug is "vegetarians" (plural) in your seed.
const DIET_TARGET: Record<string, { category: string; forum: string; label: string }> = {
    VEGAN: { category: "vegan", forum: "recipes", label: "Vegan" },
    VEGETARIAN: { category: "vegetarians", forum: "recipes", label: "Vegetarian" },
};

const PH = ["p1", "p2", "p3", "p4", "p5"];

/* ---------- small local helpers (kept self-contained on purpose) ---------- */

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uniqueThreadSlug(base: string) {
    const root = base || "recipe";
    let slug = root;
    let n = 2;
    while (await prisma.thread.findUnique({ where: { slug } })) slug = `${root}-${n++}`;
    return slug;
}

async function uniqueRecipeSlug(base: string) {
    const root = base || "recipe";
    let slug = root;
    let n = 2;
    while (await prisma.recipe.findUnique({ where: { slug } })) slug = `${root}-${n++}`;
    return slug;
}

const ESCAPES: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};
function esc(s: string) {
    return s.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}
function lines(s: string) {
    return s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}
function parseImages(raw: string): string[] {
    try {
        return JSON.parse(raw || "[]");
    } catch {
        return [];
    }
}

/**
 * Build the opening-post HTML from the structured submission fields.
 * Every user value is HTML-escaped — the only tags in the output are the ones
 * we add ourselves, so there's no path for injected markup.
 */
function buildPostBody(sub: {
    dietLabel: string;
    ingredients: string;
    method: string;
    prepMin: number | null;
    cookMin: number | null;
    readyMin: number | null;
    images: string;
    title: string;
}) {
    const imgs = parseImages(sub.images);
    const imgHtml = imgs
        .slice(0, 10)
        .map((src) => `<p><img src="${esc(src)}" alt="${esc(sub.title)}" /></p>`)
        .join("");

    const times: string[] = [];
    if (sub.prepMin != null) times.push(`<strong>Prep:</strong> ${sub.prepMin} min`);
    if (sub.cookMin != null) times.push(`<strong>Cook:</strong> ${sub.cookMin} min`);
    if (sub.readyMin != null) times.push(`<strong>Ready in:</strong> ${sub.readyMin} min`);
    const timesHtml = times.length ? `<p>${times.join(" · ")}</p>` : "";

    const ing = lines(sub.ingredients).map((l) => `<li>${esc(l)}</li>`).join("");
    const steps = lines(sub.method).map((l) => `<li>${esc(l)}</li>`).join("");

    return (
        imgHtml +
        `<p><strong>Diet:</strong> ${esc(sub.dietLabel)}</p>` +
        timesHtml +
        `<h3>Ingredients</h3><ul>${ing}</ul>` +
        `<h3>Method</h3><ol>${steps}</ol>`
    );
}

async function requireAdmin(): Promise<{ id: string } | { error: string }> {
    const admin = await currentUser();
    if (!admin) return { error: "You must be logged in." };
    if (admin.role !== "ADMIN") return { error: "Admins only." };
    return { id: admin.id };
}

function revalidateQueue(extra?: string) {
    revalidatePath("/admin/submissions");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    if (extra) revalidatePath(extra);
    revalidatePath("/forum");
}

/* ----------------------------- approve ----------------------------- */

export async function approveSubmission(id: string): Promise<ReviewResult> {
    const admin = await requireAdmin();
    if ("error" in admin) return { ok: false, error: admin.error };

    const sub = await prisma.recipeSubmission.findUnique({ where: { id } });
    if (!sub) return { ok: false, error: "Submission not found." };
    if (sub.status !== "PENDING") return { ok: false, error: "Already reviewed." };

    const target = DIET_TARGET[sub.dietType];
    if (!target) return { ok: false, error: `Unknown diet type "${sub.dietType}".` };

    const forum = await prisma.forum.findFirst({
        where: { slug: target.forum, category: { slug: target.category } },
    });
    if (!forum) {
        return { ok: false, error: `Forum ${target.category}/${target.forum} doesn't exist — check your seed.` };
    }

    const body = buildPostBody({
        dietLabel: target.label,
        ingredients: sub.ingredients,
        method: sub.method,
        prepMin: sub.prepMin,
        cookMin: sub.cookMin,
        readyMin: sub.readyMin,
        images: sub.images,
        title: sub.title,
    });

    const slug = await uniqueThreadSlug(slugify(sub.title));
    const now = new Date();
    const authorId = sub.userId ?? admin.id; // credit the member; fall back to admin

    await prisma.$transaction([
        prisma.thread.create({
            data: {
                forumId: forum.id,
                authorId,
                title: sub.title,
                slug,
                lastPostAt: now,
                posts: { create: { authorId, body } },
            },
        }),
        prisma.recipeSubmission.update({
            where: { id: sub.id },
            data: { status: "APPROVED", threadSlug: slug, reviewedAt: now },
        }),
    ]);

    revalidateQueue(`/forum/${target.category}/${target.forum}`);
    return { ok: true };
}

/* ----------------------------- reject ----------------------------- */

export async function rejectSubmission(id: string): Promise<ReviewResult> {
    const admin = await requireAdmin();
    if ("error" in admin) return { ok: false, error: admin.error };

    const sub = await prisma.recipeSubmission.findUnique({ where: { id } });
    if (!sub) return { ok: false, error: "Submission not found." };
    if (sub.status !== "PENDING") return { ok: false, error: "Already reviewed." };

    await prisma.recipeSubmission.update({
        where: { id },
        data: { status: "REJECTED", reviewedAt: new Date() },
    });

    revalidateQueue();
    return { ok: true };
}

/* ------------------- pull back an approved recipe ------------------- */
// Deletes the live thread (and its posts) and returns the recipe to Pending.

export async function pullBackSubmission(id: string): Promise<ReviewResult> {
    const admin = await requireAdmin();
    if ("error" in admin) return { ok: false, error: admin.error };

    const sub = await prisma.recipeSubmission.findUnique({ where: { id } });
    if (!sub) return { ok: false, error: "Submission not found." };
    if (sub.status !== "APPROVED") return { ok: false, error: "Only approved recipes can be pulled back." };

    if (sub.threadSlug) {
        const thread = await prisma.thread.findUnique({ where: { slug: sub.threadSlug } });
        if (thread) {
            await prisma.$transaction([
                prisma.post.deleteMany({ where: { threadId: thread.id } }),
                prisma.thread.delete({ where: { id: thread.id } }),
            ]);
        }
    }

    await prisma.recipeSubmission.update({
        where: { id },
        data: { status: "PENDING", threadSlug: null, reviewedAt: null },
    });

    const target = DIET_TARGET[sub.dietType];
    revalidateQueue(target ? `/forum/${target.category}/${target.forum}` : undefined);
    return { ok: true };
}

/* ------------------- re-open a rejected submission ------------------- */

export async function reopenSubmission(id: string): Promise<ReviewResult> {
    const admin = await requireAdmin();
    if ("error" in admin) return { ok: false, error: admin.error };

    const sub = await prisma.recipeSubmission.findUnique({ where: { id } });
    if (!sub) return { ok: false, error: "Submission not found." };
    if (sub.status !== "REJECTED") return { ok: false, error: "Only rejected submissions can be re-opened." };

    await prisma.recipeSubmission.update({
        where: { id },
        data: { status: "PENDING", reviewedAt: null },
    });

    revalidateQueue();
    return { ok: true };
}

/* ------------- promote a submission into the real Recipe library ------------- */

export async function convertToRecipe(id: string): Promise<ReviewResult> {
    const admin = await requireAdmin();
    if ("error" in admin) return { ok: false, error: admin.error };

    const sub = await prisma.recipeSubmission.findUnique({ where: { id } });
    if (!sub) return { ok: false, error: "Submission not found." };
    if (sub.recipeSlug) return { ok: false, error: "This is already in the recipe library." };

    const imgs = parseImages(sub.images);
    const slug = await uniqueRecipeSlug(slugify(sub.title));

    // Bump sort so the new recipe lands at the front of "latest".
    const maxSort = await prisma.recipe.aggregate({ _max: { sort: true } });
    const sort = (maxSort._max.sort ?? 0) + 1;

    await prisma.$transaction([
        prisma.recipe.create({
            data: {
                id: slug, // id === slug in this model
                slug,
                title: sub.title,
                sourceUrl: "",
                date: new Date().toISOString().slice(0, 10),
                description: "", // submissions don't capture one — fill it in the editor
                recipeType: "",  // ditto
                author: sub.authorName ?? "Community",
                prepTime: sub.prepMin,
                cookTime: sub.cookMin,
                readyIn: sub.readyMin,
                ingredients: JSON.stringify(lines(sub.ingredients)),
                steps: JSON.stringify(lines(sub.method)),
                image: imgs[0] ?? null,             // first photo becomes the hero
                gallery: JSON.stringify(imgs.slice(1)), // the rest become the gallery
                ph: PH[sub.title.length % PH.length],
                sort,
            },
        }),
        prisma.recipeSubmission.update({
            where: { id },
            data: { recipeSlug: slug },
        }),
    ]);

    revalidatePath("/recipes");
    revalidatePath(`/recipes/${slug}`);
    revalidatePath("/admin/submissions");
    return { ok: true };
}