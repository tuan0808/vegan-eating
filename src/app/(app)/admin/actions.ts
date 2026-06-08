// src/app/admin/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ROLES = ["MEMBER", "MODERATOR", "ADMIN"];

export async function setUserRole(formData: FormData) {
    // Re-check on the server — never trust that the caller is an admin just because
    // the page rendered. Server actions are public endpoints.
    const session = await auth();
    if (session?.user?.role !== "ADMIN") redirect("/dashboard");

    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "");

    if (!ROLES.includes(role)) redirect("/admin?error=role");
    // Block changing your own role so you can't accidentally lock yourself out.
    if (userId === session.user.id) redirect("/admin?error=self");

    await prisma.user.update({ where: { id: userId }, data: { role } });

    revalidatePath("/admin");
    redirect("/admin?ok=1");
}