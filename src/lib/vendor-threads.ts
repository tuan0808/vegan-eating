// src/lib/vendor-threads.ts
//
// Links the vendor promo editor to the forum: when a new promo code is saved in
// Admin → Vendor deals, a thread is auto-created in the Vendor Deals board (the
// one the "Browse all deals" link points at). Each vendor remembers its thread
// slug so we create exactly one thread per code, never a duplicate on re-save.
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import type { Vendor } from "@/lib/vendor-config";

const SANITIZE: sanitizeHtml.IOptions = {
    allowedTags: ["p", "br", "strong", "em", "code", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener", target: "_blank" }) },
};

const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function uniqueThreadSlug(base: string): Promise<string> {
    const root = base || "promo-code";
    let slug = root;
    let n = 2;
    while (await prisma.thread.findUnique({ where: { slug }, select: { id: true } })) slug = `${root}-${n++}`;
    return slug;
}

/** Pull the category + forum slug out of the "Browse all deals" link (path or
 *  absolute URL). Returns null if it isn't a /forum/<category>/<board> link. */
export function parseBoard(dealsHref: string): { categorySlug: string; forumSlug: string } | null {
    let path = dealsHref.trim();
    const m = path.match(/^https?:\/\/[^/]+(\/.*)$/i);
    if (m) path = m[1];
    const parts = path.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length !== 3 || parts[0] !== "forum") return null;
    return { categorySlug: parts[1], forumSlug: parts[2] };
}

const threadTitle = (v: Vendor) => (v.blurb ? `${v.name} — ${v.blurb}` : `${v.name} promo code`);

function threadBody(v: Vendor): string {
    const lines = [`<p><strong>${esc(v.name)}</strong>${v.blurb ? ` — ${esc(v.blurb)}` : ""}.</p>`];
    if (v.code) lines.push(`<p>Members' promo code: <code>${esc(v.code)}</code></p>`);
    if (v.url) lines.push(`<p><a href="${esc(v.url)}">Visit ${esc(v.name)}</a></p>`);
    return sanitizeHtml(lines.join(""), SANITIZE);
}

/**
 * Create a forum thread for each vendor that has a code but no thread yet.
 * Returns the vendors with `threadSlug` filled in for any new threads, plus the
 * created count and the board path to revalidate. Best-effort: a failure on one
 * vendor (or a missing board) never blocks saving the config.
 */
export async function syncVendorThreads(
    vendors: Vendor[],
    dealsHref: string,
    fallbackAuthorId: string,
): Promise<{ vendors: Vendor[]; created: number; boardPath: string | null }> {
    const board = parseBoard(dealsHref);
    if (!board) return { vendors, created: 0, boardPath: null };

    const forum = await prisma.forum
        .findFirst({ where: { slug: board.forumSlug, category: { slug: board.categorySlug } }, select: { id: true } })
        .catch(() => null);
    if (!forum) return { vendors, created: 0, boardPath: null };

    const boardPath = `/forum/${board.categorySlug}/${board.forumSlug}`;
    // Prefer the shared team account so threads read as the brand, not an admin.
    const team = await prisma.user
        .findUnique({ where: { email: "team@veganeating.com" }, select: { id: true } })
        .catch(() => null);
    const authorId = team?.id ?? fallbackAuthorId;

    let created = 0;
    const out: Vendor[] = [];
    for (const v of vendors) {
        if (v.threadSlug || !v.code) { out.push(v); continue; }
        try {
            const slug = await uniqueThreadSlug(slugify(threadTitle(v)));
            const now = new Date();
            await prisma.thread.create({
                data: {
                    forumId: forum.id,
                    authorId,
                    title: threadTitle(v),
                    slug,
                    tag: "Promo",
                    lastPostAt: now,
                    posts: { create: { authorId, body: threadBody(v) } },
                },
            });
            created++;
            out.push({ ...v, threadSlug: slug });
        } catch {
            // Leave this vendor without a threadSlug so the next save retries it.
            out.push(v);
        }
    }

    return { vendors: out, created, boardPath };
}
