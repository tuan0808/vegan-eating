// src/lib/maintenance.ts
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getSetting } from "@/lib/settings";

export type MaintenanceState = {
    enabled: boolean;
    endsAt: string | null;
    message: string | null;
};

// cache() dedupes this to a single DB read per request, so the layout gate and
// the screen share one lookup.
export const getMaintenance = cache(async (): Promise<MaintenanceState> => {
    const [enabled, endsAt, message] = await Promise.all([
        getSetting("maintenance_enabled"),
        getSetting("maintenance_ends_at"),
        getSetting("maintenance_message"),
    ]);
    return {
        enabled: enabled === "true",
        endsAt: endsAt || null,
        message: message || null,
    };
});

export async function isMaintenanceBlocked(): Promise<boolean> {
    const { enabled } = await getMaintenance();
    if (!enabled) return false;

    // Keep admin + API reachable so you can keep working / toggle it back off.
    const pathname = headers().get("x-pathname") ?? "";
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) return false;

    // Preview bypass (cookie set by middleware via ?bypass=TOKEN).
    const token = process.env.MAINTENANCE_BYPASS_TOKEN;
    const bypass = cookies().get("mb")?.value;
    if (token && bypass === token) return false;

    return true;
}