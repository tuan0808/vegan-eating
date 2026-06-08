// src/app/(app)/admin/forums/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/dashboard");
}

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uniqueCategorySlug(base: string) {
    let slug = base || "category";
    let n = 2;
    while (await prisma.category.findUnique({ where: { slug } })) slug = `${base}-${n++}`;
    return slug;
}

async function uniqueForumSlug(categoryId: string, base: string) {
    let slug = base || "board";
    let n = 2;
    while (await prisma.forum.findUnique({ where: { categoryId_slug: { categoryId, slug } } }))
        slug = `${base}-${n++}`;
    return slug;
}

// Refresh both the admin view and the public board, then bounce back.
function done(error?: string): never {
    revalidatePath("/admin/forums");
    revalidatePath("/forum");
    redirect(error ? `/admin/forums?error=${error}` : "/admin/forums?ok=1");
}

/* ---------- Categories ---------- */

export async function createCategory(formData: FormData) {
    await requireAdmin();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    if (!name) done("name");
    const max = await prisma.category.aggregate({ _max: { position: true } });
    await prisma.category.create({
        data: {
            name,
            slug: await uniqueCategorySlug(slugify(name)),
            description,
            position: (max._max.position ?? -1) + 1,
        },
    });
    done();
}

export async function updateCategory(formData: FormData) {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    if (!id || !name) done("name");
    await prisma.category.update({ where: { id }, data: { name, description } });
    done();
}

export async function deleteCategory(formData: FormData) {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const forums = await prisma.forum.count({ where: { categoryId: id } });
    if (forums > 0) done("notempty"); // never cascade-delete boards/threads by accident
    await prisma.category.delete({ where: { id } });
    done();
}

export async function moveCategory(formData: FormData) {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const dir = String(formData.get("dir") ?? "");
    const cats = await prisma.category.findMany({ orderBy: { position: "asc" } });
    const i = cats.findIndex((c) => c.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= cats.length) done(); // already at an edge
    await prisma.$transaction([
        prisma.category.update({ where: { id: cats[i].id }, data: { position: cats[j].position } }),
        prisma.category.update({ where: { id: cats[j].id }, data: { position: cats[i].position } }),
    ]);
    done();
}

/* ---------- Boards (forums) ---------- */

export async function createForum(formData: FormData) {
    await requireAdmin();
    const categoryId = String(formData.get("categoryId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    if (!categoryId || !name) done("name");
    const max = await prisma.forum.aggregate({ where: { categoryId }, _max: { position: true } });
    await prisma.forum.create({
        data: {
            categoryId,
            name,
            slug: await uniqueForumSlug(categoryId, slugify(name)),
            description,
            position: (max._max.position ?? -1) + 1,
        },
    });
    done();
}

export async function updateForum(formData: FormData) {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    if (!id || !name) done("name");
    await prisma.forum.update({ where: { id }, data: { name, description } });
    done();
}

export async function deleteForum(formData: FormData) {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const threads = await prisma.thread.count({ where: { forumId: id } });
    if (threads > 0) done("notempty"); // require it be empty first
    await prisma.forum.delete({ where: { id } });
    done();
}

export async function moveForum(formData: FormData) {
    await requireAdmin();
    const id = String(formData.get("id") ?? "");
    const dir = String(formData.get("dir") ?? "");
    const forum = await prisma.forum.findUnique({ where: { id } });
    if (!forum) done();
    const forums = await prisma.forum.findMany({
        where: { categoryId: forum.categoryId },
        orderBy: { position: "asc" },
    });
    const i = forums.findIndex((f) => f.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= forums.length) done();
    await prisma.$transaction([
        prisma.forum.update({ where: { id: forums[i].id }, data: { position: forums[j].position } }),
        prisma.forum.update({ where: { id: forums[j].id }, data: { position: forums[i].position } }),
    ]);
    done();
}