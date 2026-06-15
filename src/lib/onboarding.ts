// src/lib/onboarding.ts
import { prisma } from "@/lib/prisma";

/**
 * The thread every new member must read before they can post anywhere.
 * Set `slug` to the actual slug of your "Welcome to the forums" topic in
 * General → News. (categorySlug / forumSlug should match your board slugs.)
 */
export const WELCOME_THREAD = {
    categorySlug: "general",
    forumSlug: "news",
    slug: "welcome-to-the-forums", // <-- set this to your real thread slug
};

export function welcomeHref(): string {
    const w = WELCOME_THREAD;
    return `/forum/${w.categorySlug}/${w.forumSlug}/${w.slug}`;
}

export function isWelcomeThread(p: {
    categorySlug: string;
    forumSlug: string;
    threadSlug: string;
}): boolean {
    return (
        p.categorySlug === WELCOME_THREAD.categorySlug &&
        p.forumSlug === WELCOME_THREAD.forumSlug &&
        p.threadSlug === WELCOME_THREAD.slug
    );
}

/**
 * Call from the forum thread page on render. No-ops unless the viewer is a
 * logged-in user who hasn't been onboarded AND is on the welcome thread.
 * The `onboardedAt: null` guard means it only ever writes once.
 */
export async function markWelcomeViewed(p: {
    userId?: string | null;
    categorySlug: string;
    forumSlug: string;
    threadSlug: string;
}): Promise<void> {
    if (!p.userId) return;
    if (!isWelcomeThread(p)) return;
    await prisma.user.updateMany({
        where: { id: p.userId, onboardedAt: null },
        data: { onboardedAt: new Date() },
    });
}

/** True if this member still needs to read the welcome thread. Mods/admins exempt. */
export async function needsOnboarding(userId: string): Promise<boolean> {
    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, onboardedAt: true },
    });
    if (!u) return false;
    return u.role === "MEMBER" && !u.onboardedAt;
}