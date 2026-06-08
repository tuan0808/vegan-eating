// src/app/(site)/forum/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// "new" is a real route segment (the New-thread page), so a thread can't own it
// as a slug or it'd be unreachable. Reserve it.
const RESERVED_THREAD_SLUGS = new Set(["new"]);

function slugify(s: string) {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uniqueThreadSlug(base: string) {
    let root = base || "thread";
    if (RESERVED_THREAD_SLUGS.has(root)) root = `${root}-thread`;
    let slug = root;
    let n = 2;
    while (await prisma.thread.findUnique({ where: { slug } })) slug = `${root}-${n++}`;
    return slug;
}

/**
 * The editor sends HTML. We allow only a safe subset of tags/attributes and
 * strip everything else — this is the line of defence against stored XSS, so it
 * happens here on the server, never trusting the client. Links get forced
 * rel/target. Anything not on the allowlist (script, style, iframe, onClick, …)
 * is dropped.
 */
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

/**
 * New thread. Creates the Thread plus its opening Post in one write — the first
 * post IS the opening message. Gated on being logged in (any role). The
 * email-verification gate slots in at the marked spot when you go to prod.
 */
export async function createThread(formData: FormData) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const categorySlug = String(formData.get("categorySlug") ?? "");
    const forumSlug = String(formData.get("forumSlug") ?? "");

    // Honeypot: hidden from real people. If it's filled, it's a bot — pretend
    // success so it learns nothing, but write nothing.
    if (String(formData.get("website") ?? "").trim() !== "") {
        redirect(`/forum/${categorySlug}/${forumSlug}`);
    }

    // --- prod cutover: gate posting on a verified email ---
    // if (!session.user.emailVerified) redirect("/dashboard?verify=1");

    const title = String(formData.get("title") ?? "").trim();
    const { html: body, empty } = cleanBody(String(formData.get("body") ?? ""));

    const forum = await prisma.forum.findFirst({
        where: { slug: forumSlug, category: { slug: categorySlug } },
    });
    if (!forum) redirect("/forum");

    if (title.length < 3 || empty) {
        redirect(`/forum/${categorySlug}/${forumSlug}/new?error=missing`);
    }

    const slug = await uniqueThreadSlug(slugify(title));
    const now = new Date();

    await prisma.thread.create({
        data: {
            forumId: forum.id,
            authorId: session.user.id,
            title,
            slug,
            lastPostAt: now,
            posts: { create: { authorId: session.user.id, body } },
        },
    });

    revalidatePath(`/forum/${categorySlug}/${forumSlug}`);
    revalidatePath("/forum");
    redirect(`/forum/${categorySlug}/${forumSlug}/${slug}`);
}

/**
 * Reply. Appends a Post and bumps the thread's lastPostAt so the board re-sorts.
 */
export async function createReply(formData: FormData) {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const categorySlug = String(formData.get("categorySlug") ?? "");
    const forumSlug = String(formData.get("forumSlug") ?? "");
    const threadSlug = String(formData.get("threadSlug") ?? "");

    if (String(formData.get("website") ?? "").trim() !== "") {
        redirect(`/forum/${categorySlug}/${forumSlug}/${threadSlug}`);
    }

    // --- prod cutover: gate posting on a verified email ---
    // if (!session.user.emailVerified) redirect("/dashboard?verify=1");

    const { html: body, empty } = cleanBody(String(formData.get("body") ?? ""));

    const thread = await prisma.thread.findUnique({ where: { slug: threadSlug } });
    if (!thread) redirect("/forum");
    if (thread.locked) redirect(`/forum/${categorySlug}/${forumSlug}/${threadSlug}`);
    if (empty) redirect(`/forum/${categorySlug}/${forumSlug}/${threadSlug}?error=empty`);

    const now = new Date();
    await prisma.$transaction([
        prisma.post.create({ data: { threadId: thread.id, authorId: session.user.id, body } }),
        prisma.thread.update({ where: { id: thread.id }, data: { lastPostAt: now } }),
    ]);

    revalidatePath(`/forum/${categorySlug}/${forumSlug}/${threadSlug}`);
    revalidatePath(`/forum/${categorySlug}/${forumSlug}`);
    revalidatePath("/forum");
    redirect(`/forum/${categorySlug}/${forumSlug}/${threadSlug}`);
}