// src/lib/contact.ts
import { prisma } from "@/lib/prisma";

// All inquiries for the admin Website tab. OPEN first, then newest.
export async function listContactMessages() {
    return prisma.contactMessage.findMany({
        orderBy: [{ status: "desc" }, { createdAt: "desc" }], // "OPEN" sorts before "HANDLED"
        include: {
            user: { select: { username: true, name: true, avatarUrl: true } },
        },
    });
}

export async function openContactCount() {
    return prisma.contactMessage.count({ where: { status: "OPEN" } });
}