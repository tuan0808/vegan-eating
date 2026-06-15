// src/lib/views.ts
import { prisma } from "./prisma";

export type ViewSummary = { count: number; initials: string[] };

type Kind = "recipe" | "article";

// Admin baseline face shown when no member has viewed yet (Vegor → "V").
const BASELINE = ["V"];

// Count of distinct members who've viewed, plus the initials of the most
// recent few. Count floors at 1 so the hero never reads "0", and falls back to
// the admin baseline face when there are no real member views yet.
export async function viewSummary(kind: Kind, itemId: string): Promise<ViewSummary> {
    if (!itemId) return { count: 1, initials: BASELINE };
    const [count, recent] = await Promise.all([
        prisma.itemView.count({ where: { kind, itemId } }),
        prisma.itemView.findMany({
            where: { kind, itemId },
            orderBy: { viewedAt: "desc" },
            take: 4,
            select: { userName: true },
        }),
    ]);
    const initials = recent
        .map((v) => (v.userName || "").trim().charAt(0).toUpperCase())
        .filter(Boolean);
    return { count: Math.max(1, count), initials: initials.length ? initials : BASELINE };
}

// Records one member's view of an item (idempotent — repeat views just refresh
// the timestamp). No-op for anonymous visitors; they still bump the public
// `views` integer in the route, but don't get a face here.
export async function recordMemberView(
    kind: Kind,
    itemId: string,
    user: { id?: string | null; email?: string | null; name?: string | null } | null | undefined,
): Promise<void> {
    const userId = (user?.id ?? user?.email) || null;
    if (!itemId || !userId) return;
    const userName = (user?.name || user?.email || "").trim();
    await prisma.itemView.upsert({
        where: { kind_itemId_userId: { kind, itemId, userId } },
        create: { kind, itemId, userId, userName },
        update: { userName, viewedAt: new Date() },
    });
}