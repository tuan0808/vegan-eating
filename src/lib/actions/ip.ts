// src/lib/actions/ip.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-helpers";

async function requireAdmin() {
    const user = await currentUser();
    if (user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function blockIp(formData: FormData) {
    await requireAdmin();
    const ip = String(formData.get("ip") ?? "").trim();
    if (!ip) return;
    const reason = String(formData.get("reason") ?? "Manual block");
    await prisma.blockedIp.upsert({ where: { ip }, update: {}, create: { ip, reason } });
    revalidatePath("/admin/security");
}

export async function unblockIp(formData: FormData) {
    await requireAdmin();
    const ip = String(formData.get("ip") ?? "").trim();
    if (ip) await prisma.blockedIp.deleteMany({ where: { ip } });
    revalidatePath("/admin/security");
}

/**
 * For a duplicate-signup cluster: block the IP AND ban every account that
 * registered from it. The decisive "this is a bot farm" action.
 */
export async function blockSignupCluster(formData: FormData) {
    await requireAdmin();
    const ip = String(formData.get("ip") ?? "").trim();
    if (!ip) return;
    await prisma.$transaction([
        prisma.blockedIp.upsert({
            where: { ip },
            update: {},
            create: { ip, reason: "Multiple accounts from one IP" },
        }),
        prisma.user.updateMany({ where: { signupIp: ip }, data: { banned: true } }),
    ]);
    revalidatePath("/admin/security");
}