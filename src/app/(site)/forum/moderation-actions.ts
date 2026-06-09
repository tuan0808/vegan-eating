// src/app/(site)/forum/moderation-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function isMod(role?: string | null) {
    return role === "ADMIN" || role === "MODERATOR";
}

// Same allowlist as the posting actions — the only HTML we ever trust is what
// survives this filter, applied server-side on every write.
const POST_SANITIZE: sanitizeHtml.IOptions = {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "strike", "ul", "ol", "li", "blockquote", "code", "pre", "h2", "h3", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
        a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener", target: "_blank" }),
    },
};

function cleanBody(raw: string): { html: string; empty: boolean } {
    const html = sanitizeHtml(raw, POST_SANITIZE);
    const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/gi, " ").trim();
    return { html, empty: text.length === 0 };
}

function threadUrl(c: string, f: string, t: string) {
    return `/forum/${c}/${f}/${t}`;
}

/** Edit a post. Allowed for the post's author or any moderator/admin. */
export async function updatePost(formData: FormData) {
    const session = await auth();
    if (!session?.user) return;

    const c = String(formData.get("categorySlug") ?? "");
    const f = String(formData.get("forumSlug") ?? "");
    const t = String(formData.get("threadSlug") ?? "");
    const postId = String(formData.get("postId") ?? "");
    const back = threadUrl(c, f, t);

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return;

    const owns = post.authorId === session.user.id;
    if (!owns && !isMod(session.user.role)) return; // not permitted — bail silently

    const { html, empty } = cleanBody(String(formData.get("body") ?? ""));
    if (empty) return;

    await prisma.post.update({
        where: { id: postId },
        data: { body: html, editedAt: new Date() },
    });

    // No redirect: the client closes the editor and calls router.refresh() to pull
    // the fresh body. revalidatePath busts the cache so that refresh gets new data.
    revalidatePath(back);
}

/** Delete a post. Author or moderator. Deleting the opening post removes the whole thread. */
export async function deletePost(formData: FormData) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const c = String(formData.get("categorySlug") ?? "");
    const f = String(formData.get("forumSlug") ?? "");
    const t = String(formData.get("threadSlug") ?? "");
    const postId = String(formData.get("postId") ?? "");
    const back = threadUrl(c, f, t);

    const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { thread: { include: { posts: { orderBy: { createdAt: "asc" }, take: 1 } } } },
    });
    if (!post) redirect(back);

    const owns = post.authorId === session.user.id;
    if (!owns && !isMod(session.user.role)) redirect(back);

    const isOpeningPost = post.thread.posts[0]?.id === post.id;
    if (isOpeningPost) {
        // the opening post is the thread — removing it removes the thread (cascade clears its posts)
        await prisma.thread.delete({ where: { id: post.threadId } });
        revalidatePath(`/forum/${c}/${f}`);
        revalidatePath("/forum");
        redirect(`/forum/${c}/${f}`);
    }

    await prisma.post.delete({ where: { id: postId } });
    revalidatePath(back);
    revalidatePath(`/forum/${c}/${f}`);
    redirect(back);
}

/** Pin / unpin a thread. Moderators only. */
export async function togglePin(formData: FormData) {
    const session = await auth();
    const c = String(formData.get("categorySlug") ?? "");
    const f = String(formData.get("forumSlug") ?? "");
    const t = String(formData.get("threadSlug") ?? "");
    const back = threadUrl(c, f, t);
    if (!isMod(session?.user?.role)) redirect(back);

    const thread = await prisma.thread.findUnique({ where: { slug: t } });
    if (!thread) redirect(back);

    await prisma.thread.update({ where: { id: thread.id }, data: { pinned: !thread.pinned } });
    revalidatePath(back);
    revalidatePath(`/forum/${c}/${f}`);
    redirect(back);
}

/** Close (lock) / reopen a thread. Moderators only. */
export async function toggleLock(formData: FormData) {
    const session = await auth();
    const c = String(formData.get("categorySlug") ?? "");
    const f = String(formData.get("forumSlug") ?? "");
    const t = String(formData.get("threadSlug") ?? "");
    const back = threadUrl(c, f, t);
    if (!isMod(session?.user?.role)) redirect(back);

    const thread = await prisma.thread.findUnique({ where: { slug: t } });
    if (!thread) redirect(back);

    await prisma.thread.update({ where: { id: thread.id }, data: { locked: !thread.locked } });
    revalidatePath(back);
    revalidatePath(`/forum/${c}/${f}`);
    redirect(back);
}