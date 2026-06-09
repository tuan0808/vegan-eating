// src/lib/forum.ts
import { prisma } from "@/lib/prisma";

// Centralised so a category keeps its colour on the index, its forum, and its threads.
export const CATEGORY_ACCENTS = ["#c2603a", "#5b6b3f", "#c79a3c", "#3f6b5b", "#8a5a6b"];
export function accentFor(position: number): string {
    const n = CATEGORY_ACCENTS.length;
    return CATEGORY_ACCENTS[((position % n) + n) % n];
}

function shortDate(d: Date): string {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(d: Date): string {
    const diff = Date.now() - d.getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    const day = Math.round(hr / 24);
    if (day === 1) return "yesterday";
    if (day < 7) return `${day} days ago`;
    return shortDate(d);
}

function displayName(u: { name: string | null; username: string }): string {
    return u.name ?? u.username;
}

// Stable per-person colour so each member keeps the same avatar tint.
function avatarColor(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return CATEGORY_ACCENTS[h % CATEGORY_ACCENTS.length];
}

/* ============================ Index ============================ */

export type ForumRow = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    threadCount: number;
    postCount: number;
    lastPost: { threadTitle: string; threadSlug: string; author: string; at: string } | null;
};

export type CategoryBlock = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    accent: string;
    forums: ForumRow[];
};

export async function getForumIndex(): Promise<CategoryBlock[]> {
    const categories = await prisma.category.findMany({
        orderBy: { position: "asc" },
        include: {
            forums: {
                orderBy: { position: "asc" },
                include: { _count: { select: { threads: true } } },
            },
        },
    });

    const blocks: CategoryBlock[] = [];
    for (const cat of categories) {
        const forums: ForumRow[] = [];
        for (const f of cat.forums) {
            const postCount = await prisma.post.count({ where: { thread: { forumId: f.id } } });
            const last = await prisma.post.findFirst({
                where: { thread: { forumId: f.id } },
                orderBy: { createdAt: "desc" },
                include: { author: true, thread: true },
            });
            forums.push({
                id: f.id,
                name: f.name,
                slug: f.slug,
                description: f.description,
                threadCount: f._count.threads,
                postCount,
                lastPost: last
                    ? {
                        threadTitle: last.thread.title,
                        threadSlug: last.thread.slug,
                        author: displayName(last.author),
                        at: shortDate(last.createdAt),
                    }
                    : null,
            });
        }
        blocks.push({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            accent: accentFor(cat.position),
            forums,
        });
    }
    return blocks;
}

/* ========================= Forum view ========================= */

export type ThreadRow = {
    id: string;
    title: string;
    slug: string;
    tag: string | null;
    pinned: boolean;
    locked: boolean;
    avatarColor: string;
    startedBy: string;
    startedByInitial: string;
    startedAt: string;
    replies: number;
    lastReplyBy: string;
    lastActivity: string;
};

export type ForumView = {
    category: { name: string; slug: string };
    forum: { id: string; name: string; slug: string; description: string | null };
    accent: string;
    threads: ThreadRow[];
};

export async function getForumView(categorySlug: string, forumSlug: string): Promise<ForumView | null> {
    const forum = await prisma.forum.findFirst({
        where: { slug: forumSlug, category: { slug: categorySlug } },
        include: {
            category: true,
            threads: {
                orderBy: [{ pinned: "desc" }, { lastPostAt: "desc" }],
                include: {
                    author: true,
                    _count: { select: { posts: true } },
                    posts: { orderBy: { createdAt: "desc" }, take: 1, include: { author: true } },
                },
            },
        },
    });
    if (!forum) return null;

    return {
        category: { name: forum.category.name, slug: forum.category.slug },
        forum: { id: forum.id, name: forum.name, slug: forum.slug, description: forum.description },
        accent: accentFor(forum.category.position),
        threads: forum.threads.map((t) => {
            const starter = displayName(t.author);
            const last = t.posts[0];
            return {
                id: t.id,
                title: t.title,
                slug: t.slug,
                tag: t.tag ?? null,
                pinned: t.pinned,
                locked: t.locked,
                avatarColor: avatarColor(starter),
                startedBy: starter,
                startedByInitial: starter.charAt(0).toUpperCase(),
                startedAt: relativeTime(t.createdAt),
                replies: Math.max(0, t._count.posts - 1), // first post is the opener, not a reply
                lastReplyBy: last ? displayName(last.author) : starter,
                lastActivity: relativeTime(t.lastPostAt),
            };
        }),
    };
}

/* ========================= Thread view ========================= */

export type PostView = {
    id: string;
    authorId: string;
    author: string;
    authorInitial: string;
    date: string;
    body: string;
    isOriginal: boolean;
};

export type ThreadView = {
    category: { name: string; slug: string };
    forum: { name: string; slug: string };
    accent: string;
    title: string;
    pinned: boolean;
    locked: boolean;
    posts: PostView[];
};

export async function getThreadView(
    categorySlug: string,
    forumSlug: string,
    threadSlug: string
): Promise<ThreadView | null> {
    const thread = await prisma.thread.findUnique({
        where: { slug: threadSlug },
        include: {
            forum: { include: { category: true } },
            posts: { orderBy: { createdAt: "asc" }, include: { author: true } },
        },
    });
    if (!thread) return null;
    // the slug is globally unique, so make sure the URL's category/forum actually match it
    if (thread.forum.slug !== forumSlug || thread.forum.category.slug !== categorySlug) return null;

    return {
        category: { name: thread.forum.category.name, slug: thread.forum.category.slug },
        forum: { name: thread.forum.name, slug: thread.forum.slug },
        accent: accentFor(thread.forum.category.position),
        title: thread.title,
        pinned: thread.pinned,
        locked: thread.locked,
        posts: thread.posts.map((p, i) => {
            const name = displayName(p.author);
            return {
                id: p.id,
                authorId: p.authorId,
                author: name,
                authorInitial: name.charAt(0).toUpperCase(),
                date: shortDate(p.createdAt),
                body: p.body,
                isOriginal: i === 0,
            };
        }),
    };
}
export type ForumStats = {
    forums: number;
    topics: number;
    posts: number;
    members: number;
    latestPost: { threadTitle: string; href: string; author: string; at: string } | null;
    newestMember: string | null;
};

export async function getForumStats(): Promise<ForumStats> {
    const [forums, topics, posts, members, last, newest] = await Promise.all([
        prisma.forum.count(),
        prisma.thread.count(),
        prisma.post.count(),
        prisma.user.count(),
        prisma.post.findFirst({
            orderBy: { createdAt: "desc" },
            include: {
                author: true,
                thread: { include: { forum: { include: { category: true } } } },
            },
        }),
        prisma.user.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    return {
        forums,
        topics,
        posts,
        members,
        latestPost: last
            ? {
                threadTitle: last.thread.title,
                href: `/forum/${last.thread.forum.category.slug}/${last.thread.forum.slug}/${last.thread.slug}`,
                author: last.author.name ?? last.author.username,
                at: shortDate(last.createdAt),
            }
            : null,
        newestMember: newest ? newest.name ?? newest.username : null,
    };
}
/* ===================== Recent members (for the hero avatars) ===================== */
/* Append to the bottom of src/lib/forum.ts. Reuses prisma + the displayName and
   avatarColor helpers already defined in that file. */

export type RecentMember = { initial: string; color: string };

export async function getRecentMembers(n = 4): Promise<RecentMember[]> {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: n,
    });
    return users.map((u) => {
        const name = displayName(u);
        return {
            initial: name.charAt(0).toUpperCase(),
            color: avatarColor(u.username ?? u.id),
        };
    });
}
