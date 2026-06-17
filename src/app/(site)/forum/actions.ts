// src/app/(site)/forum/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import { guardCommunityPost, type GuardFail } from "@/lib/anti-spam";
import { getAntiSpamConfig } from "@/lib/antispam-config";


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

// Translate a failed guard into the right redirect for the forum's flow.
function redirectForGuard(guard: GuardFail, formUrl: string): never {
    if (guard.reason === "signin") redirect("/login");
    // Everything else (unverified / banned / blocked / cooldown / hourly /
    // too_fast / links / duplicate) stays on the form with an inline message,
    // so the user understands why instead of being bounced elsewhere.
    redirect(`${formUrl}?error=${guard.reason}`);
}

// Rate-limit lookup for the forum: count this user's posts (openers + replies)
// and return the last body so the guard can catch near-duplicate reposts.
async function recentForumActivity(userId: string) {
    const hourAgo = new Date(Date.now() - 3_600_000);
    const [last, lastHourCount] = await Promise.all([
        prisma.post.findFirst({
            where: { authorId: userId },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true, body: true },
        }),
        prisma.post.count({ where: { authorId: userId, createdAt: { gte: hourAgo } } }),
    ]);
    return { lastAt: last?.createdAt ?? null, lastHourCount, lastBody: last?.body ?? null };
}

/**
 * New thread. Creates the Thread plus its opening Post in one write — the first
 * post IS the opening message. Stricter rate limit than replies, since new
 * threads are the prime spam real estate.
 */
export async function createThread(formData: FormData) {
    const categorySlug = String(formData.get("categorySlug") ?? "");
    const forumSlug = String(formData.get("forumSlug") ?? "");

    // Honeypot first (cheapest): hidden from real people. If it's filled, it's a
    // bot — pretend success so it learns nothing, but write nothing.
    if (String(formData.get("website") ?? "").trim() !== "") {
        redirect(`/forum/${categorySlug}/${forumSlug}`);
    }

    // Shared gate: sign-in + verified + not-banned + IP blocklist + rate limit,
    // plus content checks (too-fast / link cap / duplicate). Thread thresholds
    // come from the admin-tunable config (the "thread" surface).
    const title = String(formData.get("title") ?? "").trim();
    const { html: body, empty } = cleanBody(String(formData.get("body") ?? ""));
    const tsRaw = Number(formData.get("ts"));
    const submittedAtMs = Number.isFinite(tsRaw) && tsRaw > 0 ? tsRaw : null;

    const guard = await guardCommunityPost(
        recentForumActivity,
        { surface: "thread" },
        { body, submittedAtMs },
    );
    if (!guard.ok) redirectForGuard(guard, `/forum/${categorySlug}/${forumSlug}/new`);
    const { userId, ip, userAgent } = guard;

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
            authorId: userId,
            title,
            slug,
            lastPostAt: now,
            posts: { create: { authorId: userId, body, ipAddress: ip, userAgent } },
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
    const categorySlug = String(formData.get("categorySlug") ?? "");
    const forumSlug = String(formData.get("forumSlug") ?? "");
    const threadSlug = String(formData.get("threadSlug") ?? "");

    if (String(formData.get("website") ?? "").trim() !== "") {
        redirect(`/forum/${categorySlug}/${forumSlug}/${threadSlug}`);
    }

    const { html: body, empty } = cleanBody(String(formData.get("body") ?? ""));
    const tsRaw = Number(formData.get("ts"));
    const submittedAtMs = Number.isFinite(tsRaw) && tsRaw > 0 ? tsRaw : null;

    const guard = await guardCommunityPost(recentForumActivity, undefined, { body, submittedAtMs });
    if (!guard.ok) redirectForGuard(guard, `/forum/${categorySlug}/${forumSlug}/${threadSlug}`);
    const { userId, ip, userAgent, isProbation } = guard;

    const thread = await prisma.thread.findUnique({ where: { slug: threadSlug } });
    if (!thread) redirect("/forum");
    if (thread.locked) redirect(`/forum/${categorySlug}/${forumSlug}/${threadSlug}`);
    if (empty) redirect(`/forum/${categorySlug}/${forumSlug}/${threadSlug}?error=empty`);

    const base = `/forum/${categorySlug}/${forumSlug}/${threadSlug}`;

    // Hold the first few replies from a brand-new account for moderator review.
    let status = "APPROVED";
    if (isProbation) {
        const cfg = await getAntiSpamConfig();
        if (cfg.holdFirstN > 0) {
            const approved = await prisma.post.count({ where: { authorId: userId, status: "APPROVED" } });
            if (approved < cfg.holdFirstN) status = "PENDING";
        }
    }

    if (status === "PENDING") {
        // Held: it isn't live, so don't bump lastPostAt; tell the user it's pending.
        await prisma.post.create({
            data: { threadId: thread.id, authorId: userId, body, status, ipAddress: ip, userAgent },
        });
        revalidatePath("/dashboard");
        redirect(`${base}?pending=1`);
    }

    const now = new Date();
    await prisma.$transaction([
        prisma.post.create({ data: { threadId: thread.id, authorId: userId, body, status, ipAddress: ip, userAgent } }),
        prisma.thread.update({ where: { id: thread.id }, data: { lastPostAt: now } }),
    ]);

    revalidatePath(base);
    revalidatePath(`/forum/${categorySlug}/${forumSlug}`);
    revalidatePath("/forum");
    redirect(base);
}