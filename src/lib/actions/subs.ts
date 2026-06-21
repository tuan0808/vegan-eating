// src/lib/actions/subs.ts
"use server";

import { prisma } from "@/lib/prisma";
import { matchSubs, type RecipeSub, type SubRow, type Sub } from "@/lib/subs";

function safeArr<T>(s: string | null | undefined): T[] {
    try {
        const v = JSON.parse(s || "[]");
        return Array.isArray(v) ? (v as T[]) : [];
    } catch {
        return [];
    }
}

export async function getSubstitutions(lines: string[]): Promise<RecipeSub[]> {
    if (!Array.isArray(lines) || lines.length === 0) return [];

    const raw = await prisma.ingredientSub.findMany({
        select: { name: true, aliases: true, subs: true, vegan: true },
    });

    const rows: SubRow[] = raw.map((r) => ({
        name: r.name,
        aliases: safeArr<string>(r.aliases),
        subs: safeArr<Sub>(r.subs),
        vegan: r.vegan,
    }));

    return matchSubs(lines, rows);
}