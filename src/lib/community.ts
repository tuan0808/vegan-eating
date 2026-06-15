// src/lib/community.ts
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 * Forum URL helper
 * ------------------------------------------------------------------ *
 * Threads route by category + forum + thread slug in the public forum.
 * If your public thread URL differs, this is the ONE place to change it
 * and every link across the dashboard updates.
 * ------------------------------------------------------------------ */
type ThreadLinkShape = {
    slug: string;
    forum?: { slug: string; category?: { slug: string } | null } | null;
};
export function threadHref(t: ThreadLinkShape): string {
    const cat = t.forum?.category?.slug;
    const forum = t.forum?.slug;
    if (cat && forum) return `/forums/${cat}/${forum}/${t.slug}`;
    return `/forums/thread/${t.slug}`;
}

/* ------------------------------------------------------------------ *
 * Dashboard — "latest on the site" feed
 * Recipe has no createdAt timestamp, so we sort by sort desc then date.
 * ------------------------------------------------------------------ */
export async function latestRecipesFeed(take = 6) {
    return prisma.recipe.findMany({
        where: { hidden: false },
        orderBy: [{ sort: "desc" }, { date: "desc" }],
        take,
        select: {
            id: true,
            slug: true,
            title: true,
            image: true,
            date: true,
            recipeType: true,
        },
    });
}

/* ------------------------------------------------------------------ *
 * Notification counts (cheap, indexed)
 * ------------------------------------------------------------------ */
export async function unreadMessageCount(userId: string) {
    return prisma.message.count({
        where: { recipientId: userId, readAt: null },
    });
}

export async function pendingPostCount(userId: string) {
    return prisma.post.count({
        where: { authorId: userId, status: "PENDING" },
    });
}

/* ------------------------------------------------------------------ *
 * Messages — inbox grouped by conversation partner
 * Flat Message table: pull recent rows touching this user, reduce to the
 * latest message per partner in JS, attach unread counts.
 * ------------------------------------------------------------------ */
export type InboxRow = {
    partner: { id: string; username: string; name: string | null; avatarUrl: string | null };
    lastMessage: { body: string; createdAt: Date; fromMe: boolean };
    unread: number;
};

export async function inbox(userId: string): Promise<InboxRow[]> {
    const rows = await prisma.message.findMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
        orderBy: { createdAt: "desc" },
        take: 400, // recent window is plenty for a personal inbox
        include: {
            sender: { select: { id: true, username: true, name: true, avatarUrl: true } },
            recipient: { select: { id: true, username: true, name: true, avatarUrl: true } },
        },
    });

    const byPartner = new Map<string, InboxRow>();
    for (const m of rows) {
        const fromMe = m.senderId === userId;
        const partner = fromMe ? m.recipient : m.sender;
        const existing = byPartner.get(partner.id);
        if (!existing) {
            byPartner.set(partner.id, {
                partner,
                lastMessage: { body: m.body, createdAt: m.createdAt, fromMe },
                unread: !fromMe && !m.readAt ? 1 : 0,
            });
        } else if (!fromMe && !m.readAt) {
            existing.unread += 1;
        }
    }
    return Array.from(byPartner.values()).sort(
        (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime(),
    );
}

export async function conversationWith(userId: string, partnerUsername: string) {
    const partner = await prisma.user.findUnique({
        where: { username: partnerUsername },
        select: { id: true, username: true, name: true, avatarUrl: true },
    });
    if (!partner) return null;

    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: userId, recipientId: partner.id },
                { senderId: partner.id, recipientId: userId },
            ],
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true, senderId: true, readAt: true },
    });

    return { partner, messages };
}

/* ------------------------------------------------------------------ *
 * My Activity
 * ------------------------------------------------------------------ */
const forumInclude = {
    thread: {
        select: {
            title: true,
            slug: true,
            forum: { select: { slug: true, name: true, category: { select: { slug: true } } } },
        },
    },
} as const;

// Your posts awaiting moderation (opening posts + replies, since everything is a Post).
export async function myPendingPosts(userId: string) {
    return prisma.post.findMany({
        where: { authorId: userId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: forumInclude,
    });
}

// Threads you started, with reply counts.
export async function myThreads(userId: string, take = 25) {
    return prisma.thread.findMany({
        where: { authorId: userId },
        orderBy: { lastPostAt: "desc" },
        take,
        select: {
            id: true,
            title: true,
            slug: true,
            createdAt: true,
            lastPostAt: true,
            _count: { select: { posts: true } },
            forum: { select: { slug: true, name: true, category: { select: { slug: true } } } },
        },
    });
}

// Approved replies from other people on your threads — your "someone answered you" feed.
export async function repliesToMyThreads(userId: string, take = 20) {
    return prisma.post.findMany({
        where: {
            status: "APPROVED",
            authorId: { not: userId },
            thread: { authorId: userId },
        },
        orderBy: { createdAt: "desc" },
        take,
        include: {
            author: { select: { username: true, name: true, avatarUrl: true } },
            ...forumInclude,
        },
    });
}

/* ------------------------------------------------------------------ *
 * Public profile
 * ------------------------------------------------------------------ */
export async function publicProfile(username: string) {
    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
            bio: true,
            location: true,
            website: true,
            showActivity: true,
            role: true,
            banned: true,
            createdAt: true,
        },
    });
    if (!user) return null;

    const [threadCount, postCount, recentThreads] = await Promise.all([
        prisma.thread.count({ where: { authorId: user.id } }),
        prisma.post.count({ where: { authorId: user.id, status: "APPROVED" } }),
        user.showActivity
            ? prisma.thread.findMany({
                where: { authorId: user.id },
                orderBy: { lastPostAt: "desc" },
                take: 5,
                select: {
                    title: true,
                    slug: true,
                    lastPostAt: true,
                    forum: { select: { slug: true, name: true, category: { select: { slug: true } } } },
                },
            })
            : Promise.resolve([]),
    ]);

    return { user, threadCount, postCount, recentThreads };
}

/* ------------------------------------------------------------------ *
 * The signed-in user's own editable record
 * ------------------------------------------------------------------ */
export async function myProfileRecord(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            username: true,
            name: true,
            avatarUrl: true,
            bio: true,
            location: true,
            website: true,
            showActivity: true,
            createdAt: true,
        },
    });
}