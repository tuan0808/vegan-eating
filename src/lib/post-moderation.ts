// src/lib/post-moderation.ts
import { prisma } from "@/lib/prisma";

export interface PendingPost {
    id: string;
    body: string;
    createdAt: Date;
    authorName: string;
    authorJoinedAt: Date;
    threadTitle: string;
    threadHref: string; // /forum/<category>/<forum>/<thread>
}

/**
 * Replies held for moderator review (status PENDING). Oldest first — the
 * fairest queue order, so nobody's reply waits behind newer ones.
 */
export async function getPendingPosts(limit = 50): Promise<PendingPost[]> {
    const rows = await prisma.post.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: limit,
        select: {
            id: true,
            body: true,
            createdAt: true,
            author: { select: { username: true, name: true, createdAt: true } },
            thread: {
                select: {
                    title: true,
                    slug: true,
                    forum: { select: { slug: true, category: { select: { slug: true } } } },
                },
            },
        },
    });

    return rows.map((p) => ({
        id: p.id,
        body: p.body,
        createdAt: p.createdAt,
        authorName: p.author.username ?? p.author.name ?? "Member",
        authorJoinedAt: p.author.createdAt,
        threadTitle: p.thread.title,
        threadHref: `/forum/${p.thread.forum.category.slug}/${p.thread.forum.slug}/${p.thread.slug}`,
    }));
}

export async function getPendingPostCount(): Promise<number> {
    return prisma.post.count({ where: { status: "PENDING" } });
}