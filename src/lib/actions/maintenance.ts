// src/lib/actions/maintenance.ts
"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/settings";
import { currentUser } from "@/lib/auth-helpers";

// These mutate site-wide state. The guard below is the real boundary — the
// Settings page only HIDES the controls; this is what stops a crafted POST.
async function requireAdmin() {
    const user = await currentUser();
    if (user?.role !== "ADMIN") throw new Error("Forbidden");
}

export async function setMaintenanceEnabled(enabled: boolean) {
    await requireAdmin();
    await setSetting("maintenance_enabled", enabled ? "true" : "false");
    revalidatePath("/settings");
}

export async function saveMaintenanceSchedule(endsAt: string, message: string) {
    await requireAdmin();
    await setSetting("maintenance_ends_at", endsAt ?? "");
    await setSetting("maintenance_message", message ?? "");
    revalidatePath("/settings");
}

export async function uploadMaintenanceBg(formData: FormData) {
    await requireAdmin(); // before we touch the filesystem

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
    await requireAdmin();
    await setSetting("maintenance_bg", "");
    revalidatePath("/settings");
    revalidatePath("/");
}