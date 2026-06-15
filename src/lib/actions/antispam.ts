// src/lib/actions/antispam.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/auth-helpers";
import { ANTISPAM_KEYS } from "@/lib/antispam-config";

// Returned to the form so it can show a "Saved" / error flash.
export type SaveState = { ok: boolean; message: string | null; key?: number };

function clampInt(raw: FormDataEntryValue | null, lo: number, hi: number, fallback: number) {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
}

export async function saveAntiSpamConfig(
    _prev: SaveState,
    formData: FormData,
): Promise<SaveState> {
    const user = await currentUser();
    if (user?.role !== "ADMIN") {
        return { ok: false, message: "You don't have permission to change this.", key: Date.now() };
    }

    const postCooldown = clampInt(formData.get("postCooldown"), 0, 3600, 60);
    const postHourly = clampInt(formData.get("postHourly"), 1, 1000, 10);
    const threadCooldown = clampInt(formData.get("threadCooldown"), 0, 86400, 120);
    const threadHourly = clampInt(formData.get("threadHourly"), 1, 1000, 5);

    const probationHours = clampInt(formData.get("probationHours"), 0, 720, 24);
    const probationHourly = clampInt(formData.get("probationHourly"), 1, 1000, 2);
    const probationMaxLinks = clampInt(formData.get("probationMaxLinks"), 0, 50, 0);
    const trustedMaxLinks = clampInt(formData.get("trustedMaxLinks"), 0, 50, 3);
    const minSubmitSec = clampInt(formData.get("minSubmitSec"), 0, 120, 3);
    const holdFirstN = clampInt(formData.get("holdFirstN"), 0, 20, 2);

    const upsert = (key: string, value: string) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });

    try {
        await prisma.$transaction([
            upsert(ANTISPAM_KEYS.postCooldown, String(postCooldown)),
            upsert(ANTISPAM_KEYS.postHourly, String(postHourly)),
            upsert(ANTISPAM_KEYS.threadCooldown, String(threadCooldown)),
            upsert(ANTISPAM_KEYS.threadHourly, String(threadHourly)),
            upsert(ANTISPAM_KEYS.probationHours, String(probationHours)),
            upsert(ANTISPAM_KEYS.probationHourly, String(probationHourly)),
            upsert(ANTISPAM_KEYS.probationMaxLinks, String(probationMaxLinks)),
            upsert(ANTISPAM_KEYS.trustedMaxLinks, String(trustedMaxLinks)),
            upsert(ANTISPAM_KEYS.minSubmitSec, String(minSubmitSec)),
            upsert(ANTISPAM_KEYS.holdFirstN, String(holdFirstN)),
        ]);
    } catch {
        return { ok: false, message: "Couldn't save — try again.", key: Date.now() };
    }

    revalidatePath("/admin/security");
    return { ok: true, message: "Rate limits saved.", key: Date.now() };
}