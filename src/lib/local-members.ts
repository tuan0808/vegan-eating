// src/lib/local-members.ts — the member lists behind Admin → Local signups and its CSV export.
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { enteredInWindow, type Giveaway } from "./local-markets";

export const VIEWS = {
    entries: "Giveaway entries",
    local: "Local members",
    "not-local": "Not local",
} as const;
export type View = keyof typeof VIEWS;

export function isView(v: unknown): v is View {
    return typeof v === "string" && v in VIEWS;
}

const select = {
    id: true, username: true, email: true, emailVerified: true, igHandle: true, zipCode: true,
    localMarket: true, signupSource: true, igFollowVerifiedAt: true, giveawayEnteredAt: true, createdAt: true,
} satisfies Prisma.UserSelect;
export type LocalMember = Prisma.UserGetPayload<{ select: typeof select }>;

const LIMIT = 2000;

export async function localMembers(view: View, giveaway: Giveaway): Promise<LocalMember[]> {
    const where: Prisma.UserWhereInput =
        view === "entries" ? { giveawayEnteredAt: { not: null } }
        : view === "local" ? { localMarket: { not: null } }
        : { localMarket: null };
    const rows = await prisma.user.findMany({ where: { ...where, banned: false }, select, orderBy: { createdAt: "desc" }, take: LIMIT });
    return view === "entries" ? rows.filter((r) => enteredInWindow(giveaway, r.giveawayEnteredAt)) : rows;
}

export async function localStats(markets: { key: string }[]) {
    const [byMarket, notLocal, fromQr] = await Promise.all([
        prisma.user.groupBy({ by: ["localMarket"], where: { localMarket: { not: null }, banned: false }, _count: true }),
        prisma.user.count({ where: { localMarket: null, banned: false } }),
        prisma.user.count({ where: { signupSource: { startsWith: "local:" } } }),
    ]);
    const counts = Object.fromEntries(byMarket.map((r) => [r.localMarket as string, r._count]));
    return { perMarket: markets.map((m) => counts[m.key] ?? 0), notLocal, fromQr };
}
