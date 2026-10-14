"use server";
// src/lib/actions/roles.ts — save the Admin → Roles matrix and custom roles.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { BUILT_IN_ROLES, getRoleConfig, isPermission, saveRoleConfig, type Permission, type RoleConfig } from "@/lib/permissions";

export type SaveState = { ok: boolean; message: string | null; key?: number };

const ROLE_KEY_RE = /^[A-Z][A-Z0-9_]{1,23}$/;
const MAX_CUSTOM = 20;

export async function saveRolesAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
    // Roles is admin-only and not grantable: whoever edits it can give themselves anything.
    try {
        await requireRole(["ADMIN"]);
    } catch {
        return { ok: false, message: "You don't have permission to change this.", key: Date.now() };
    }
    const fail = (message: string): SaveState => ({ ok: false, message, key: Date.now() });

    let raw: { custom?: unknown; grants?: unknown };
    try {
        raw = JSON.parse(String(formData.get("config") ?? "{}"));
    } catch {
        return fail("Could not read the roles.");
    }

    const builtIn = BUILT_IN_ROLES.map((r) => r.key);
    const custom: RoleConfig["custom"] = [];
    for (const r of Array.isArray(raw.custom) ? raw.custom : []) {
        const key = String(r?.key ?? "").trim().toUpperCase();
        const label = String(r?.label ?? "").trim();
        if (!ROLE_KEY_RE.test(key)) return fail(`"${key || label}" isn't a valid role name — use 2–24 letters, numbers or _.`);
        if (!label || label.length > 40) return fail(`Role ${key}: the display name must be 1–40 characters.`);
        if (builtIn.includes(key) || custom.some((c) => c.key === key)) return fail(`There's already a role called ${key}.`);
        custom.push({ key, label });
    }
    if (custom.length > MAX_CUSTOM) return fail(`At most ${MAX_CUSTOM} custom roles.`);

    // Never strand members on a role that no longer exists.
    const before = await getRoleConfig();
    const removed = before.custom.map((r) => r.key).filter((k) => !custom.some((c) => c.key === k));
    if (removed.length) {
        const held = await prisma.user.groupBy({ by: ["role"], where: { role: { in: removed } }, _count: true });
        if (held.length) {
            const list = held.map((h) => `${h.role} (${h._count})`).join(", ");
            return fail(`Move these members to another role first: ${list}.`);
        }
    }

    const grants: Record<string, Permission[]> = {};
    const editable = [...builtIn.filter((k) => k !== "ADMIN"), ...custom.map((c) => c.key)];
    const rawGrants = (raw.grants && typeof raw.grants === "object" ? raw.grants : {}) as Record<string, unknown>;
    for (const role of editable) {
        const perms = rawGrants[role];
        grants[role] = Array.isArray(perms) ? [...new Set(perms.filter(isPermission))] : [];
    }

    await saveRoleConfig({ custom, grants });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Roles saved. Changes apply on each member's next page load.", key: Date.now() };
}
