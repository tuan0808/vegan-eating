// src/lib/settings.ts
import { prisma } from "@/lib/prisma"; // ← point this at your existing Prisma client (named or default export)

export async function getSetting(key: string): Promise<string | null> {
    // No database is reachable during `next build` on App Platform (the build
    // container can't reach the DB, and encrypted env vars aren't exposed to the
    // build phase). This helper runs inside the (site) layout, so an unguarded
    // query crashes static generation on the very first page. Skip it at build
    // time and fall back to the safe default; the real value is read at runtime
    // (and on every ISR revalidate).
    if (process.env.NEXT_PHASE === "phase-production-build" || !process.env.DATABASE_URL) {
        return null;
    }
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