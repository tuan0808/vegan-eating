// src/lib/veganize-admin.ts
import { prisma } from "@/lib/prisma";

export const VEGANIZE_DEFAULTS: Record<string, number> = {
    "veganize.dailyCap": 5,
    "veganize.cooldownSec": 20,
    "veganize.globalDailyCap": 300,
    "veganize.minAccountAgeHours": 24,
    "veganize.maxInputChars": 6000,
};

export async function getVeganizeCaps(): Promise<Record<string, number>> {
    const rows = await prisma.setting.findMany({
        where: { key: { in: Object.keys(VEGANIZE_DEFAULTS) } },
    });
    const map = new Map(rows.map((r) => [r.key, Number(r.value)]));
    const out: Record<string, number> = {};
    for (const k of Object.keys(VEGANIZE_DEFAULTS)) {
        const v = map.get(k);
        out[k] = Number.isFinite(v) ? (v as number) : VEGANIZE_DEFAULTS[k];
    }
    return out;
}

export function countGenerations() {
    return prisma.veganizeRequest.count({ where: { cached: false } });
}

// Every generation (newest first) with its author and whether it's been saved.
export async function listGenerations(take = 100, skip = 0) {
    const reqs = await prisma.veganizeRequest.findMany({
        where: { cached: false },
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { user: { select: { username: true, name: true } } },
    });

    const ids = reqs.map((r) => r.id);
    const subs = ids.length
        ? await prisma.recipeSubmission.findMany({
            where: { veganizeRequestId: { in: ids } },
            select: { id: true, veganizeRequestId: true, status: true },
        })
        : [];
    const byReq = new Map(subs.map((s) => [s.veganizeRequestId, s]));

    return reqs.map((r) => ({ ...r, submission: byReq.get(r.id) ?? null }));
}