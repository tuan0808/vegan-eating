// src/lib/actions/maintenance.ts
"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/settings";

// NOTE: these mutate site state — keep them behind whatever auth guards your admin.

export async function setMaintenanceEnabled(enabled: boolean) {
    await setSetting("maintenance_enabled", enabled ? "true" : "false");
    revalidatePath("/settings"); // adjust if your Settings page lives at a different URL
}

export async function saveMaintenanceSchedule(endsAt: string, message: string) {
    await setSetting("maintenance_ends_at", endsAt ?? "");
    await setSetting("maintenance_message", message ?? "");
    revalidatePath("/settings");
}