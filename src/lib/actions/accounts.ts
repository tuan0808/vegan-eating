// src/lib/actions/accounts.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-helpers";

async function requireAdmin() {
    const user = await currentUser();
    if (user?.role !== "ADMIN") throw new Error("Forbidden");
    return user;
}

/** Guard: never let a bulk moderation sweep touch staff, even if ids are spoofed. */
async function memberIds(ids: string[]): Promise<string[]> {
    const clean = Array.from(new Set(ids.filter(Boolean)));
    if (!clean.length) return [];
    const rows = await prisma.user.findMany({
        where: { id: { in: clean }, role: "MEMBER" },
        select: { id: true },
    });
    return rows.map((r) => r.id);
}

/** Ban selected accounts (reversible). The safe default for the suspicious-accounts sweep. */
export async function banAccounts(ids: string[]): Promise<{ banned: number }> {
    await requireAdmin();
    const targets = await memberIds(ids);
    if (!targets.length) return { banned: 0 };
    const res = await prisma.user.updateMany({ where: { id: { in: targets } }, data: { banned: true } });
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { banned: res.count };
}

/** Un-ban (in case of a false positive). */
export async function unbanAccounts(ids: string[]): Promise<{ unbanned: number }> {
    await requireAdmin();
    const targets = await memberIds(ids);
    if (!targets.length) return { unbanned: 0 };
    const res = await prisma.user.updateMany({ where: { id: { in: targets } }, data: { banned: false } });
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { unbanned: res.count };
}

/**
 * Hard-delete selected accounts. Every User relation is onDelete: Cascade, so their
 * comments/posts/threads/tokens/etc. go with them — clean for content-less bots. Use
 * ban if you want a reversible action or the account has legit content worth keeping.
 */
export async function deleteAccounts(ids: string[]): Promise<{ deleted: number }> {
    await requireAdmin();
    const targets = await memberIds(ids);
    if (!targets.length) return { deleted: 0 };
    const res = await prisma.user.deleteMany({ where: { id: { in: targets } } });
    revalidatePath("/admin/security");
    revalidatePath("/admin");
    return { deleted: res.count };
}
