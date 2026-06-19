// src/app/(app)/admin/news/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { syncNews } from "@/lib/news-sync";

async function requireAdmin() {
    const user = await requireUser();
    if (user.role !== "ADMIN") throw new Error("Not authorised");
    return user;
}

// Keep this identical to the normTitle in src/lib/news-sync.ts so the one-time
// re-scan and the live sync agree on what counts as the same story.
function normTitle(s: string) {
    return s
        .toLowerCase()
        .replace(/\s+[-|–—]\s+[^-|–—]+$/, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

/**
 * Manual "Fetch latest news" trigger. Admin-gated wrapper around the same
 * syncNews() the cron uses, so the dedup pass runs here too.
 */
export async function runNewsSyncNow(): Promise<{ fetched: number; saved: number; duplicates: number }> {
    await requireAdmin();
    const res = await syncNews();
    revalidatePath("/admin/news");
    revalidatePath("/news");
    return res;
}

/**
 * Soft hide / unhide. This is the DURABLE curation tool: the sync's upsert never
 * touches `hidden`, so a hidden story stays hidden through every future sync.
 */
export async function setNewsHidden(slug: string, hidden: boolean): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.newsArticle.update({ where: { slug }, data: { hidden } });
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath(`/news/${slug}`);
}

/**
 * Bulk hide / unhide by slug — the bulk-selection bar's durable curation action.
 * Same durability as setNewsHidden: the sync's upsert never touches `hidden`, so
 * these stay hidden through future syncs. Preferred over bulk delete for keeping
 * stories off the public feed, since deleted rows can return on the next sync.
 */
export async function setNewsHiddenMany(slugs: string[], hidden: boolean): Promise<{ updated: number }> {
    await requireAdmin();
    const clean = Array.from(new Set(slugs.filter(Boolean)));
    if (!clean.length) return { updated: 0 };
    const res = await prisma.newsArticle.updateMany({ where: { slug: { in: clean } }, data: { hidden } });
    revalidatePath("/admin/news");
    revalidatePath("/news");
    return { updated: res.count };
}

/**
 * Hard delete. Note: if the story is still inside newsdata's ~48h window, the next
 * sync will re-create it (upsert keyed on externalId) — but as a flagged duplicate
 * if its title still matches a visible original, so it won't reach the public feed.
 * To permanently keep something off the public site, prefer Hide.
 */
export async function deleteNews(slug: string): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.newsArticle.delete({ where: { slug } });
    revalidatePath("/admin/news");
    revalidatePath("/news");
}

/**
 * Bulk hard delete by slug — used by the Duplicates review queue so staff can
 * clear flagged copies in one pass instead of one at a time. Same caveat as
 * deleteNews: a story still inside newsdata's window may return on the next sync,
 * but as a flagged duplicate, so it stays off the public feed.
 */
export async function deleteNewsMany(slugs: string[]): Promise<{ deleted: number }> {
    await requireAdmin();
    const clean = Array.from(new Set(slugs.filter(Boolean)));
    if (!clean.length) return { deleted: 0 };
    const res = await prisma.newsArticle.deleteMany({ where: { slug: { in: clean } } });
    revalidatePath("/admin/news");
    revalidatePath("/news");
    return { deleted: res.count };
}

/**
 * Rename. Safe to edit: the sync only sets `title` on create, never on update,
 * so a rename persists across syncs.
 */
export async function renameNews(slug: string, title: string): Promise<void> {
    await requireAdmin();
    if (!slug) return;
    await prisma.newsArticle.update({
        where: { slug },
        data: { title: title.trim() || "Untitled" },
    });
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath(`/news/${slug}`);
}

/**
 * One-time (re-runnable) backfill for exact-title duplicates that predate the
 * dupeOf field — or that slipped through before the dedup sync shipped.
 *
 * Scans the same pool the live sync seeds from (visible, not-already-flagged),
 * groups by normalised title, keeps the first row by ingest order (createdAt,
 * then slug for a stable tiebreak) and flags the rest: hidden = true, dupeOf =
 * the keeper's slug. Idempotent — after one pass each title has a single visible
 * original, so a second run finds nothing. Manually-hidden rows are left alone.
 */
export async function rescanNewsDuplicates(): Promise<{ groups: number; flagged: number }> {
    await requireAdmin();

    const rows = await prisma.newsArticle.findMany({
        where: { hidden: false, dupeOf: null },
        select: { slug: true, title: true },
        orderBy: [{ createdAt: "asc" }, { slug: "asc" }],
    });

    const groups = new Map<string, string[]>(); // normalised title -> slugs in ingest order
    for (const r of rows) {
        const k = normTitle(r.title);
        if (!k) continue;
        const arr = groups.get(k);
        if (arr) arr.push(r.slug);
        else groups.set(k, [r.slug]);
    }

    let flagged = 0;
    let dupeGroups = 0;
    for (const slugs of Array.from(groups.values())) {
        if (slugs.length < 2) continue;
        dupeGroups++;
        const [keeper, ...rest] = slugs; // first stays visible
        await prisma.newsArticle.updateMany({
            where: { slug: { in: rest } },
            data: { hidden: true, dupeOf: keeper },
        });
        flagged += rest.length;
    }

    revalidatePath("/admin/news");
    revalidatePath("/news");
    return { groups: dupeGroups, flagged };
}