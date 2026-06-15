// src/lib/antispam-config.ts
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Defaults match the original hardcoded values — used as fallbacks until an
// admin saves their own in the panel.
const DEFAULTS = {
    postCooldownSec: 60,   // comments + forum replies
    postHourly: 10,
    threadCooldownSec: 120, // new forum threads (stricter)
    threadHourly: 5,
};

const K = {
    postCooldown: "antispam_post_cooldown",
    postHourly: "antispam_post_hourly",
    threadCooldown: "antispam_thread_cooldown",
    threadHourly: "antispam_thread_hourly",
};

export interface AntiSpamConfig {
    postCooldownSec: number;
    postHourly: number;
    threadCooldownSec: number;
    threadHourly: number;
    postCooldownMs: number;
    threadCooldownMs: number;
}

export const getAntiSpamConfig = cache(async (): Promise<AntiSpamConfig> => {
    const rows = await prisma.setting.findMany({ where: { key: { in: Object.values(K) } } });
    const m = new Map(rows.map((r) => [r.key, r.value]));
    const num = (key: string, fallback: number) => {
        const v = Number(m.get(key));
        return Number.isFinite(v) && v >= 0 ? v : fallback;
    };

    const postCooldownSec = num(K.postCooldown, DEFAULTS.postCooldownSec);
    const postHourly = num(K.postHourly, DEFAULTS.postHourly);
    const threadCooldownSec = num(K.threadCooldown, DEFAULTS.threadCooldownSec);
    const threadHourly = num(K.threadHourly, DEFAULTS.threadHourly);

    return {
        postCooldownSec,
        postHourly,
        threadCooldownSec,
        threadHourly,
        postCooldownMs: postCooldownSec * 1000,
        threadCooldownMs: threadCooldownSec * 1000,
    };
});

export interface AntiSpamStats {
    blockedIps: number;
    bannedUsers: number;
    spamComments: number;
}

export async function getAntiSpamStats(): Promise<AntiSpamStats> {
    const [blockedIps, bannedUsers, spamComments] = await Promise.all([
        prisma.blockedIp.count(),
        prisma.user.count({ where: { banned: true } }),
        prisma.comment.count({ where: { status: "SPAM" } }),
    ]);
    return { blockedIps, bannedUsers, spamComments };
}

export const ANTISPAM_KEYS = K;