// src/lib/home-threads.ts
import { prisma } from "@/lib/prisma";

// Small accent palette so the rows read varied, like the home mockup.
const ACCENTS = ["#225F27", "#2F7D38", "#C98A2B", "#E15A22"];

function timeAgo(d: Date): string {
    const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(d).toLocaleDateString();
}

export type HomeThread = {
    slug: string;
    href: string;
    title: string;
    cat: string;
    accent: string;
    initial: string;
    meta: string;
    replies: number;
};

// Newest activity first. lastPostAt is bumped on every approved reply, so a
// thread that just got a reply jumps to the top here.
export async function latestThreads(take = 3): Promise<HomeThread[]> {
    const rows = await prisma.thread.findMany({
        orderBy: { lastPostAt: "desc" },
        take,
        select: {
            slug: true,
            title: true,
            lastPostAt: true,
            author: { select: { name: true, username: true } },
            forum: { select: { name: true, slug: true, category: { select: { slug: true } } } },
            _count: { select: { posts: true } },
        },
    });

    return rows.map((t, i) => {
        const who = t.author?.name ?? t.author?.username ?? "A member";
        const cat = t.forum?.category?.slug ?? "general";
        const fslug = t.forum?.slug ?? "general";
        return {
            slug: t.slug,
            href: `/forum/${cat}/${fslug}/${t.slug}`,
            title: t.title,
            cat: t.forum?.name ?? "Discussion",
            accent: ACCENTS[i % ACCENTS.length],
            initial: who.charAt(0).toUpperCase(),
            meta: `Started by ${who} · ${timeAgo(t.lastPostAt)}`,
            replies: Math.max(0, t._count.posts - 1), // exclude the opening post
        };
    });
}