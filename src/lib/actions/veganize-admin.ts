// src/lib/actions/veganize-admin.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

// Mirrors the AntiSpam save contract so the form can drive a keyed flash.
export type SaveState = { ok: boolean; message: string | null; key?: number };

const KEYS = [
    "veganize.dailyCap",
    "veganize.cooldownSec",
    "veganize.globalDailyCap",
    "veganize.minAccountAgeHours",
    "veganize.maxInputChars",
];

// Form action — upserts whichever cap fields were submitted. Admin only.
// Now shaped for useFormState: takes (prevState, formData) and returns a SaveState
// so the panel can show a "✓ Limits saved." confirmation, exactly like AntiSpam.
export async function updateVeganizeSettings(
    _prev: SaveState,
    formData: FormData,
): Promise<SaveState> {
    // requireRole redirects non-admins; keep it OUTSIDE the try so its control-flow
    // redirect propagates instead of being turned into an error flash.
    await requireRole(["ADMIN"]);

    try {
        for (const key of KEYS) {
            const raw = formData.get(key);
            if (raw == null) continue;
            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) continue;
            const value = String(Math.round(n));
            await prisma.setting.upsert({
                where: { key },
                create: { key, value },
                update: { value },
            });
        }

        revalidatePath("/admin/security");
        revalidatePath("/admin/veganize");

        return { ok: true, message: "Limits saved.", key: Date.now() };
    } catch (e) {
        console.error("updateVeganizeSettings failed:", e);
        return { ok: false, message: "Couldn't save — try again.", key: Date.now() };
    }
}