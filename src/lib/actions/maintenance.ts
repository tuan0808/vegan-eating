// src/lib/actions/maintenance.ts
"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/settings";

// NOTE: these mutate site state — keep them behind whatever auth guards your admin.

export async function setMaintenanceEnabled(enabled: boolean) {
    await setSetting("maintenance_enabled", enabled ? "true" : "false");
    revalidatePath("/settings");
}

export async function saveMaintenanceSchedule(endsAt: string, message: string) {
    await setSetting("maintenance_ends_at", endsAt ?? "");
    await setSetting("maintenance_message", message ?? "");
    revalidatePath("/settings");
}

export async function uploadMaintenanceBg(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return;
    if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
    if (file.size > 8 * 1024 * 1024) throw new Error("Image is larger than 8 MB.");

    const bytes = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "media");
    await mkdir(dir, { recursive: true });

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const filename = `maintenance-bg-${Date.now()}.${ext}`;
    await writeFile(path.join(dir, filename), bytes);

    await setSetting("maintenance_bg", `/media/${filename}`);
    revalidatePath("/settings");
    revalidatePath("/");
}

export async function clearMaintenanceBg() {
    await setSetting("maintenance_bg", "");
    revalidatePath("/settings");
    revalidatePath("/");
}