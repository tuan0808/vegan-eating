// src/app/actions/post-moderation.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-helpers";

async function requireModerator() {
    const user = await currentUser();
    if (!user || (user.role !== "MODERATOR" && user.role !== "ADMIN")) {
        throw new Error("Not authorised");
    }
    return user;
}

// Revalidate the thread the post belongs to (so it appears) plus the dashboard.
async function revalidateForPost(postId: string) {
    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: {
            thread: {
                select: { slug: true, forum: { select: { slug: true, category: { select: { slug: true } } } } },
            },
        },
    });
    if (post) {
        const { category, slug: forumSlug } = post.thread.forum;
        const base = `/forum/${category.slug}/${forumSlug}`;
        revalidatePath(`${base}/${post.thread.slug}`);
        revalidatePath(base);
        revalidatePath("/forum");
    }
    revalidatePath("/dashboard");
}

/** Approve a held reply: it goes live and bumps the thread's activity. */
export async function approvePost(formData: FormData) {
    await requireModerator();
    const postId = String(formData.get("postId") ?? "");
    if (!postId) return;

    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, threadId: true, status: true },
    });
    if (!post || post.status !== "PENDING") return; // nothing to do

    await prisma.$transaction([
        prisma.post.update({ where: { id: post.id }, data: { status: "APPROVED" } }),
        prisma.thread.update({ where: { id: post.threadId }, data: { lastPostAt: new Date() } }),
    ]);

    await revalidateForPost(post.id);
}

/** Reject a held reply: removed entirely. */
export async function rejectPost(formData: FormData) {
    await requireModerator();
    const postId = String(formData.get("postId") ?? "");
    if (!postId) return;

    const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, status: true },
    });
    if (!post || post.status !== "PENDING") return;

    await revalidateForPost(post.id); // resolve thread paths before deleting
    await prisma.post.delete({ where: { id: post.id } });
}