// src/lib/actions/contact.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth-helpers";

const clamp = (s: string, max: number) => s.slice(0, max).trim();
const CATEGORIES = ["GENERAL", "SUPPORT", "RECIPES"];

export type ContactResult = { ok: boolean; error?: string };

// Public contact form -> a new inquiry tied to the signed-in account.
export async function sendContactMessage(formData: FormData): Promise<ContactResult> {
    const me = await requireUser();

    const rawCat = String(formData.get("category") ?? "GENERAL");
    const category = CATEGORIES.includes(rawCat) ? rawCat : "GENERAL";
    let name = clamp(String(formData.get("name") ?? ""), 80);
    const body = clamp(String(formData.get("body") ?? ""), 4000);

    if (!body) return { ok: false, error: "Please write a message." };

    if (!name) {
        const u = await prisma.user.findUnique({
            where: { id: me.id },
            select: { name: true, username: true },
        });
        name = u?.name ?? u?.username ?? "Member";
    }

    await prisma.contactMessage.create({
        data: { userId: me.id, name, category, body, status: "OPEN" },
    });

    revalidatePath("/messages");
    revalidatePath("/dashboard");
    return { ok: true };
}

// Admin-only: flip an inquiry between OPEN and HANDLED.
// Bind id+status at the call site: setContactStatus.bind(null, id, "HANDLED").
export async function setContactStatus(id: string, status: string) {
    await requireRole(["ADMIN"]);
    const next = status === "HANDLED" ? "HANDLED" : "OPEN";
    await prisma.contactMessage.update({ where: { id }, data: { status: next } });
    revalidatePath("/messages");
}