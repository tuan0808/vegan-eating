// src/lib/actions/contact.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth-helpers";

const clamp = (s: string, max: number) => s.slice(0, max).trim();
const CATEGORIES = ["GENERAL", "SUPPORT", "RECIPES"];

export type ContactResult = { ok: boolean; error?: string };

// Open a NEW ticket. One OPEN ticket per member — while one's in progress they
// reply on it instead; new tickets unlock once it's HANDLED.
export async function sendContactMessage(formData: FormData): Promise<ContactResult> {
    const me = await requireUser();

    const existing = await prisma.contactMessage.findFirst({
        where: { userId: me.id, status: "OPEN" },
        select: { id: true },
    });
    if (existing) {
        return {
            ok: false,
            error: "You already have an open inquiry — continue it below. You can start a new one once it's resolved.",
        };
    }

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

    revalidatePath("/contact");
    revalidatePath("/messages");
    revalidatePath("/dashboard");
    return { ok: true };
}

// Reply on an existing ticket. Allowed for the ticket owner or any admin,
// and only while the ticket is OPEN.
export async function replyToTicket(ticketId: string, rawBody: string): Promise<ContactResult> {
    const me = await requireUser();
    const body = clamp(rawBody, 4000);
    if (!body) return { ok: false, error: "Write a reply first." };

    const ticket = await prisma.contactMessage.findUnique({
        where: { id: ticketId },
        select: { id: true, userId: true, status: true },
    });
    if (!ticket) return { ok: false, error: "That inquiry no longer exists." };
    if (ticket.status !== "OPEN") return { ok: false, error: "This inquiry has been resolved." };

    const isAdmin = me.role === "ADMIN";
    if (!isAdmin && ticket.userId !== me.id) {
        return { ok: false, error: "You can't reply to this inquiry." };
    }

    await prisma.contactReply.create({ data: { ticketId, authorId: me.id, body } });

    revalidatePath("/contact");
    revalidatePath(`/messages/website/${ticketId}`);
    revalidatePath("/messages");
    return { ok: true };
}

// Admin-only: resolve/reopen a ticket. Resolving frees the member to open a new one.
// Bind id+status at the call site: setContactStatus.bind(null, id, "HANDLED").
export async function setContactStatus(id: string, status: string) {
    await requireRole(["ADMIN"]);
    const next = status === "HANDLED" ? "HANDLED" : "OPEN";
    await prisma.contactMessage.update({ where: { id }, data: { status: next } });
    revalidatePath("/messages");
    revalidatePath(`/messages/website/${id}`);
    revalidatePath("/contact");
}