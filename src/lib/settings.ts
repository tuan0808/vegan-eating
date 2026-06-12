// src/lib/settings.ts
import { prisma } from "@/lib/prisma"; // ← point this at your existing Prisma client (named or default export)

export async function getSetting(key: string): Promise<string | null> {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
    await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
}