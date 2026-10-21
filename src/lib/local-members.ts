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

// Spike detection: a run of giveaway entries far faster than shoppers trickle in
// is the signature of a script. Flags any 10-minute stretch with BURST_MIN+
// entries; overlapping stretches merge into one burst.
const BURST_WINDOW_MS = 10 * 60 * 1000;
const BURST_MIN = 10;

export type Burst = { start: Date; end: Date; count: number };

export async function entryBursts(): Promise<Burst[]> {
    const rows = await prisma.user.findMany({
        where: { giveawayEnteredAt: { not: null } },
        select: { giveawayEnteredAt: true },
        orderBy: { giveawayEnteredAt: "asc" },
    });
    const t = rows.map((r) => r.giveawayEnteredAt!.getTime());
    const bursts: Burst[] = [];
    let lo = 0;
    for (let hi = 0; hi < t.length; hi++) {
        while (t[hi] - t[lo] > BURST_WINDOW_MS) lo++;
        if (hi - lo + 1 < BURST_MIN) continue;
        const last = bursts[bursts.length - 1];
        if (last && t[lo] <= last.end.getTime()) {
            last.end = new Date(t[hi]);
            last.count = t.filter((x) => x >= last.start.getTime() && x <= t[hi]).length;
        } else {
            bursts.push({ start: new Date(t[lo]), end: new Date(t[hi]), count: hi - lo + 1 });
        }
    }
    return bursts.reverse(); // newest first
}
