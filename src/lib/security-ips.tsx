// src/lib/security-ips.ts
import { prisma } from "@/lib/prisma";

export interface IpRow {
    ip: string;
    comments: number;
    posts: number;
    total: number;
    lastSeen: Date | null;
    blocked: boolean;
}

/**
 * Aggregates every IP we've logged across comments and forum posts, merged with
 * the blocklist. Sorted by activity so the noisiest addresses surface first.
 * NOTE: IPs only populate in production (from proxy headers) — locally they're null.
 */
export async function getIpActivity(limit = 50): Promise<IpRow[]> {
    const [commentGroups, postGroups, blocked] = await Promise.all([
        prisma.comment.groupBy({
            by: ["ipAddress"],
            where: { ipAddress: { not: null } },
            _count: { _all: true },
            _max: { createdAt: true },
        }),
        prisma.post.groupBy({
            by: ["ipAddress"],
            where: { ipAddress: { not: null } },
            _count: { _all: true },
            _max: { createdAt: true },
        }),
        prisma.blockedIp.findMany({ select: { ip: true } }),
    ]);

    const blockedSet = new Set(blocked.map((b) => b.ip));
    const map = new Map<string, IpRow>();

    const touch = (ip: string): IpRow => {
        let row = map.get(ip);
        if (!row) {
            row = { ip, comments: 0, posts: 0, total: 0, lastSeen: null, blocked: blockedSet.has(ip) };
            map.set(ip, row);
        }
        return row;
    };
    const bumpSeen = (row: IpRow, at: Date | null) => {
        if (at && (!row.lastSeen || at > row.lastSeen)) row.lastSeen = at;
    };

    for (const g of commentGroups) {
        if (!g.ipAddress) continue;
        const row = touch(g.ipAddress);
        row.comments += g._count._all;
        row.total += g._count._all;
        bumpSeen(row, g._max.createdAt);
    }
    for (const g of postGroups) {
        if (!g.ipAddress) continue;
        const row = touch(g.ipAddress);
        row.posts += g._count._all;
        row.total += g._count._all;
        bumpSeen(row, g._max.createdAt);
    }
    blockedSet.forEach((ip) => touch(ip));

    return Array.from(map.values())
        .sort((a, b) => b.total - a.total || (b.lastSeen?.getTime() ?? 0) - (a.lastSeen?.getTime() ?? 0))
        .slice(0, limit);
}

export interface DupCluster {
    ip: string;
    count: number;
    blocked: boolean;
    users: { id: string; username: string; banned: boolean; createdAt: Date }[];
}

/**
 * IPs that registered MORE THAN ONE account — the clearest bot tell. Returns
 * each offending IP with its accounts and whether the IP is already blocked.
 */
export async function getDuplicateSignupIps(): Promise<DupCluster[]> {
    const groups = await prisma.user.groupBy({
        by: ["signupIp"],
        where: { signupIp: { not: null } },
        _count: { _all: true },
        having: { signupIp: { _count: { gt: 1 } } },
    });

    const ips = groups.map((g) => g.signupIp!).filter(Boolean);
    if (ips.length === 0) return [];

    const [users, blocked] = await Promise.all([
        prisma.user.findMany({
            where: { signupIp: { in: ips } },
            select: { id: true, username: true, banned: true, createdAt: true, signupIp: true },
            orderBy: { createdAt: "asc" },
        }),
        prisma.blockedIp.findMany({ where: { ip: { in: ips } }, select: { ip: true } }),
    ]);

    const blockedSet = new Set(blocked.map((b) => b.ip));
    const byIp = new Map<string, DupCluster>();
    for (const g of groups) {
        const ip = g.signupIp!;
        byIp.set(ip, { ip, count: g._count._all, blocked: blockedSet.has(ip), users: [] });
    }
    for (const u of users) {
        const c = u.signupIp ? byIp.get(u.signupIp) : null;
        if (c) c.users.push({ id: u.id, username: u.username, banned: u.banned, createdAt: u.createdAt });
    }

    return Array.from(byIp.values()).sort((a, b) => b.count - a.count);
}