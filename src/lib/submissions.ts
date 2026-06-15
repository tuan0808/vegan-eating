// src/lib/submissions.ts
import { prisma } from "@/lib/prisma";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

export function countPendingSubmissions() {
    return prisma.recipeSubmission.count({ where: { status: "PENDING" } });
}

export function pendingSubmissions(take?: number) {
    return prisma.recipeSubmission.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        ...(take ? { take } : {}),
    });
}

export function reviewedSubmissions(take?: number) {
    return prisma.recipeSubmission.findMany({
        where: { status: { in: ["APPROVED", "REJECTED"] } },
        orderBy: { reviewedAt: "desc" },
        ...(take ? { take } : {}),
    });
}

export function getSubmission(id: string | null | undefined) {
    // Guard: findUnique panics on undefined (the selection.rs gotcha). findFirst/count tolerate it.
    if (!id) return null;
    return prisma.recipeSubmission.findUnique({ where: { id } });
}

// Where an approved recipe's thread lives. Category slugs are vegan / vegetarians.
export function threadHrefFor(dietType: string, threadSlug: string | null) {
    if (!threadSlug) return null;
    const category = dietType === "VEGETARIAN" ? "vegetarians" : "vegan";
    return `/forum/${category}/recipes/${threadSlug}`;
}