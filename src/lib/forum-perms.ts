// src/lib/forum-perms.ts
import { prisma } from "@/lib/prisma";

export type Role = "MEMBER" | "MODERATOR" | "ADMIN";

const RANK: Record<string, number> = { MEMBER: 1, MODERATOR: 2, ADMIN: 3 };

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

// For the admin dropdown + any "locked" labels in the UI.
export const ROLE_OPTIONS: { value: Role; label: string }[] = [
    { value: "MEMBER", label: "Everyone" },
    { value: "MODERATOR", label: "Mods & admins" },
    { value: "ADMIN", label: "Admins only" },
];
export const ROLE_LABEL: Record<string, string> = {
    MEMBER: "Everyone",
    MODERATOR: "Mods & admins",
    ADMIN: "Admins only",
};