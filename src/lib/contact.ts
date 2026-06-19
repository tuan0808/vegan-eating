// src/lib/contact.ts
import { prisma } from "@/lib/prisma";

// Pull a ticket's replies (oldest first) with each author's display name.
const ticketInclude = {
    replies: {
        orderBy: { createdAt: "asc" as const },
        include: { author: { select: { name: true, username: true } } },
    },
};

// All inquiries for the admin Website tab. OPEN first, then newest.
export async function listContactMessages() {
    return prisma.contactMessage.findMany({
        orderBy: [{ status: "desc" }, { createdAt: "desc" }], // "OPEN" sorts before "HANDLED"
        include: {
            user: { select: { username: true, name: true, avatarUrl: true } },
            _count: { select: { replies: true } },
        },
    });
}

export async function openContactCount() {
    return prisma.contactMessage.count({ where: { status: "OPEN" } });
}

// The signed-in member's in-progress ticket (with its thread), if any.
export async function openTicketForUser(userId: string) {
    return prisma.contactMessage.findFirst({
        where: { userId, status: "OPEN" },
        orderBy: { createdAt: "desc" },
        include: ticketInclude,
    });
}

// A single ticket with its thread (for the admin ticket view).
export async function getTicketById(id: string) {
    return prisma.contactMessage.findUnique({
        where: { id },
        include: { ...ticketInclude, user: { select: { username: true, name: true } } },
    });
}

export type ThreadMessage = {
    id: string;
    body: string;
    createdAt: Date;
    authorId: string;
    authorName: string;
};

type TicketWithReplies = {
    id: string;
    body: string;
    createdAt: Date;
    userId: string;
    name: string;
    replies: {
        id: string;
        body: string;
        createdAt: Date;
        authorId: string;
        author: { name: string | null; username: string };
    }[];
};

// Flatten a ticket into a single ordered conversation: the opening message
// (authored by the member) followed by every reply.
export function threadMessages(t: TicketWithReplies): ThreadMessage[] {
    return [
        { id: t.id, body: t.body, createdAt: t.createdAt, authorId: t.userId, authorName: t.name },
        ...t.replies.map((r) => ({
            id: r.id,
            body: r.body,
            createdAt: r.createdAt,
            authorId: r.authorId,
            authorName: r.author.name ?? r.author.username,
        })),
    ];
}