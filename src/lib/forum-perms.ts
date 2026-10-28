// src/lib/forum-perms.ts
import { prisma } from "@/lib/prisma";

export type Role = "MEMBER" | "STAFF" | "MEDIA" | "MODERATOR" | "ADMIN";

// Posting rank for board gates. MEDIA posts like a member; STAFF sits above
// members so staff-only boards (News, Rules) can let them in.
const RANK: Record<string, number> = { MEMBER: 1, MEDIA: 1, STAFF: 2, MODERATOR: 3, ADMIN: 4 };

export function roleRank(role?: string | null): number {
    return RANK[role ?? "MEMBER"] ?? 1;
}

/** True if userRole meets or exceeds the board's minimum posting role. */
export function canPostWithRole(userRole: string | null | undefined, minRole: string): boolean {
    return roleRank(userRole) >= roleRank(minRole);
}

export async function forumPostMinRole(forumId: string): Promise<string> {
    const f = await prisma.forum.findUnique({
        where: { id: forumId },
        select: { postMinRole: true },
    });
    return f?.postMinRole ?? "MEMBER";
}

/** Can this role start a thread / post in this board? */
export async function canPostInForum(forumId: string, userRole?: string | null): Promise<boolean> {
    return canPostWithRole(userRole, await forumPostMinRole(forumId));
}

/** Can this role reply in the board that owns this thread? */
export async function canReplyToThread(threadId: string, userRole?: string | null): Promise<boolean> {
    const t = await prisma.thread.findUnique({
        where: { id: threadId },
        select: { forum: { select: { postMinRole: true } } },
    });
    return canPostWithRole(userRole, t?.forum?.postMinRole ?? "MEMBER");
}

// Members must introduce themselves before posting (threads or replies) elsewhere: an
// approved post in this board, at least INTRO_WAIT_MS old. Staff and up skip it.
export const INTRO_FORUM_SLUG = "introductions";
const INTRO_WAIT_MS = 12 * 3_600_000;

export type PostGate =
    | { ok: true }
    | { ok: false; reason: "forbidden" | "intro_required" }
    | { ok: false; reason: "intro_wait"; unlocksAt: Date };

/** Can this user post (start a thread or reply) in this board? Role gate, then the intro gate. */
export async function canPostInBoard(
    user: { id: string; role?: string | null },
    forum: { slug: string; postMinRole: string },
): Promise<PostGate> {
    if (!canPostWithRole(user.role, forum.postMinRole)) return { ok: false, reason: "forbidden" };
    if (roleRank(user.role) > 1 || forum.slug === INTRO_FORUM_SLUG) return { ok: true };

    const intro = await prisma.post.findFirst({
        where: { authorId: user.id, status: "APPROVED", thread: { forum: { slug: INTRO_FORUM_SLUG } } },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
    });
    if (!intro) return { ok: false, reason: "intro_required" };
    const unlocksAt = new Date(intro.createdAt.getTime() + INTRO_WAIT_MS);
    if (unlocksAt.getTime() > Date.now()) return { ok: false, reason: "intro_wait", unlocksAt };
    return { ok: true };
}

/** Plain-language reason a member can't post here, with where to go next. */
export function postGateNotice(gate: PostGate, categorySlug = "general"): { text: string; href?: string; linkLabel?: string } | null {
    if (gate.ok) return null;
    if (gate.reason === "forbidden") return { text: "Only staff, moderators and admins can post in this board." };
    const href = `/forum/${categorySlug}/${INTRO_FORUM_SLUG}`;
    if (gate.reason === "intro_required") {
        return {
            text: "Introduce yourself first — post in Introductions, and 12 hours later you can post in the other boards.",
            href,
            linkLabel: "Go to Introductions",
        };
    }
    if (gate.reason !== "intro_wait") return null;
    const hours = Math.max(1, Math.ceil((gate.unlocksAt.getTime() - Date.now()) / 3_600_000));
    return { text: `Thanks for introducing yourself! You can post here in about ${hours} hour${hours === 1 ? "" : "s"}.` };
}

// For the admin dropdown + any "locked" labels in the UI.
export const ROLE_OPTIONS: { value: Role; label: string }[] = [
    { value: "MEMBER", label: "Everyone" },
    { value: "STAFF", label: "Staff, mods & admins" },
    { value: "MODERATOR", label: "Mods & admins" },
    { value: "ADMIN", label: "Admins only" },
];
export const ROLE_LABEL: Record<string, string> = {
    MEMBER: "Everyone",
    STAFF: "Staff, mods & admins",
    MODERATOR: "Mods & admins",
    ADMIN: "Admins only",
};