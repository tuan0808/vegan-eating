// src/lib/maintenance.ts
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { currentUser } from "@/lib/auth-helpers";
import { getSetting } from "@/lib/settings";

export type MaintenanceState = {
    enabled: boolean;
    endsAt: string | null;
    message: string | null;
    bgUrl: string | null;
};

export const getMaintenance = cache(async (): Promise<MaintenanceState> => {
    const [enabled, endsAt, message, bg] = await Promise.all([
        getSetting("maintenance_enabled"),
        getSetting("maintenance_ends_at"),
        getSetting("maintenance_message"),
        getSetting("maintenance_bg"),
    ]);
    return {
        enabled: enabled === "true",
        endsAt: endsAt || null,
        message: message || null,
        bgUrl: bg || null,
    };
});

export async function isMaintenanceBlocked(): Promise<boolean> {
    const { enabled } = await getMaintenance();
    if (!enabled) return false;

    const pathname = headers().get("x-pathname") ?? "";
    if (pathname.startsWith("/admin") || pathname.startsWith("/api") || pathname.startsWith("/login")) {
        return false;
    }

    const user = await currentUser();
    if (user?.role === "ADMIN") return false;

    const token = process.env.MAINTENANCE_BYPASS_TOKEN;
    if (token && cookies().get("mb")?.value === token) return false;

    return true;
}