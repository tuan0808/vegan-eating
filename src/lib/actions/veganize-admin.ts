// src/lib/actions/veganize-admin.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const KEYS = [
    "veganize.dailyCap",
    "veganize.cooldownSec",
    "veganize.globalDailyCap",
    "veganize.minAccountAgeHours",
    "veganize.maxInputChars",
];

// Form action — upserts whichever cap fields were submitted. Admin only.
export async function updateVeganizeSettings(formData: FormData) {
    await requireRole(["ADMIN"]);

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
}