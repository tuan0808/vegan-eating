// src/lib/permissions.ts
//
// Role → permission map for the admin area, editable at Admin → Roles so access
// changes don't need a deploy. Stored as JSON in the Setting KV store (no
// migration). ADMIN always has every permission and can't be edited; the other
// roles get exactly what's ticked. Admins can also add their own roles (e.g.
// SOCIAL); a custom role has member privileges everywhere else (forum rank 1).
//
// Some areas stay admin-only on purpose and are NOT grantable: Members (it can
// change roles, so granting it is granting ADMIN), Roles, Security, Site
// settings (newsletter, maintenance) and submissions. Forum/comment moderation
// is the MODERATOR role's built-in power, not a permission here.
//
// Checks read the role from the DB, not the JWT, so a demotion or ban takes
// effect on the next request rather than when the session cookie expires.
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSetting, setSetting } from "@/lib/settings";

export const PERMISSIONS = [
    { key: "analytics", label: "Analytics", hint: "View site traffic and page analytics" },
    { key: "socials", label: "Socials", hint: "Edit the social links on /links and the footer" },
    { key: "local", label: "Local signups", hint: "See local members + giveaway entries (emails, IG handles), verify IG follows, draw winners" },
    { key: "recipes", label: "Recipes", hint: "Create, edit, import/export recipes; upload images" },
    { key: "categories", label: "Categories", hint: "Manage recipe categories" },
    { key: "articles", label: "Articles", hint: "Create, edit, import/export articles; upload images" },
    { key: "news", label: "News", hint: "Manage the news feed and sync" },
    { key: "forums", label: "Forums", hint: "Create and configure forum boards" },
    { key: "veganize", label: "Veganizer", hint: "Answer Veganizer requests" },
    { key: "files.download", label: "Files: download", hint: "Browse and download the private staff files" },
    { key: "files.upload", label: "Files: upload", hint: "Upload files, create folders, delete/move their own" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
const ALL = PERMISSIONS.map((p) => p.key) as Permission[];

export function isPermission(v: unknown): v is Permission {
    return typeof v === "string" && (ALL as string[]).includes(v);
}

export type RoleDef = { key: string; label: string; builtIn: boolean; note?: string };

export const BUILT_IN_ROLES: RoleDef[] = [
    { key: "MEMBER", label: "Member", builtIn: true, note: "Everyone who signs up" },
    { key: "STAFF", label: "Staff", builtIn: true },
    { key: "MEDIA", label: "Media", builtIn: true, note: "Third-party partners" },
    { key: "MODERATOR", label: "Moderator", builtIn: true, note: "Always moderates forums and comments" },
    { key: "ADMIN", label: "Admin", builtIn: true, note: "Everything, always" },
];

// What each built-in role could do before roles were configurable — used until
// an admin saves the Roles page for the first time.
const DEFAULT_GRANTS: Record<string, Permission[]> = {
    STAFF: ["files.download", "files.upload"],
    MEDIA: ["files.download"],
};

export type RoleConfig = {
    custom: { key: string; label: string }[];
    grants: Record<string, Permission[]>;
};

const KEY = "roles.config";

export const getRoleConfig = cache(async (): Promise<RoleConfig> => {
    const raw = await getSetting(KEY);
    if (raw === null) return { custom: [], grants: { ...DEFAULT_GRANTS } };
    try {
        const v = JSON.parse(raw);
        const custom = Array.isArray(v?.custom)
            ? v.custom.filter((r: unknown): r is { key: string; label: string } =>
                  !!r && typeof (r as { key: unknown }).key === "string" && typeof (r as { label: unknown }).label === "string")
            : [];
        const grants: Record<string, Permission[]> = {};
        if (v?.grants && typeof v.grants === "object") {
            for (const [role, perms] of Object.entries(v.grants)) {
                if (Array.isArray(perms)) grants[role] = perms.filter(isPermission);
            }
        }
        return { custom, grants };
    } catch {
        // Corrupt value: fail closed to the original defaults rather than open.
        return { custom: [], grants: { ...DEFAULT_GRANTS } };
    }
});

export async function saveRoleConfig(config: RoleConfig): Promise<void> {
    await setSetting(KEY, JSON.stringify(config));
}

/** Built-in roles followed by the admin-created ones. */
export async function allRoles(): Promise<RoleDef[]> {
    const { custom } = await getRoleConfig();
    return [...BUILT_IN_ROLES, ...custom.map((r) => ({ ...r, builtIn: false }))];
}

export async function permissionsFor(role: string | null | undefined): Promise<Permission[]> {
    if (role === "ADMIN") return ALL;
    if (!role) return [];
    return (await getRoleConfig()).grants[role] ?? [];
}

export async function hasPermission(role: string | null | undefined, perm: Permission): Promise<boolean> {
    return (await permissionsFor(role)).includes(perm);
}

/** The signed-in user fresh from the DB (role + ban), or null. */
const freshUser = cache(async () => {
    const session = await auth();
    if (!session?.user?.id) return null;
    const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, banned: true, name: true, username: true, email: true },
    });
    return u && !u.banned ? u : null;
});

/**
 * Returns the user if they hold ANY of the given permissions, else null. For
 * server actions and API routes that answer with an error instead of redirecting.
 */
export async function userWith(...perms: Permission[]) {
    const u = await freshUser();
    if (!u) return null;
    const mine = await permissionsFor(u.role);
    return perms.some((p) => mine.includes(p)) ? u : null;
}

/** Page guard: the user if they hold the permission, else redirect (login / dashboard). */
export async function requirePermission(perm: Permission) {
    const session = await auth();
    if (!session?.user) redirect("/login");
    const u = await userWith(perm);
    if (!u) redirect("/dashboard");
    return u;
}
