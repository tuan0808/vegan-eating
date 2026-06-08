// src/lib/auth-helpers.ts
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the logged-in user, or redirects to /login. Use at the top of protected pages. */
export async function requireUser() {
    const session = await auth();
    if (!session?.user) redirect("/login");
    return session.user;
}

/** Requires one of the given roles, otherwise bounces to the dashboard. */
export async function requireRole(roles: string[]) {
    const user = await requireUser();
    if (!roles.includes(user.role)) redirect("/dashboard");
    return user;
}

/** Convenience for the nav etc. — returns the user or null without redirecting. */
export async function currentUser() {
    const session = await auth();
    return session?.user ?? null;
}