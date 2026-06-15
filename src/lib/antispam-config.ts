// src/lib/antispam-config.ts
import { cache } from "react";
import { prisma } from "@/lib/prisma";

// Defaults match the original hardcoded values — used as fallbacks until an
// admin saves their own in the panel.
const DEFAULTS = {
    postCooldownSec: 60,    // comments + forum replies
    postHourly: 10,
    threadCooldownSec: 120, // new forum threads (stricter)
    threadHourly: 5,
    // Tier 3 — content + probation heuristics
    probationHours: 24,     // accounts younger than this are "new"
    probationHourly: 2,     // hourly cap while in probation (tightest)
    probationMaxLinks: 0,   // links a new account may post (0 = none)
    trustedMaxLinks: 3,     // links an established account may post
    minSubmitSec: 3,        // reject submissions faster than a human could type
    holdFirstN: 2,          // hold this many of a new account's first posts for review (0 = off)
};

const K = {
    postCooldown: "antispam_post_cooldown",
    postHourly: "antispam_post_hourly",
    threadCooldown: "antispam_thread_cooldown",
    threadHourly: "antispam_thread_hourly",
    probationHours: "antispam_probation_hours",
    probationHourly: "antispam_probation_hourly",
    probationMaxLinks: "antispam_probation_links",
    trustedMaxLinks: "antispam_trusted_links",
    minSubmitSec: "antispam_min_submit_sec",
    holdFirstN: "antispam_hold_first_n",
};

export interface AntiSpamConfig {
    postCooldownSec: number;
    postHourly: number;
    threadCooldownSec: number;
    threadHourly: number;
    postCooldownMs: number;
    threadCooldownMs: number;
    // Tier 3
    probationHours: number;
    probationMs: number;
    probationHourly: number;
    probationMaxLinks: number;
    trustedMaxLinks: number;
    minSubmitSec: number;
    minSubmitMs: number;
    holdFirstN: number;
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

    const probationHours = num(K.probationHours, DEFAULTS.probationHours);
    const probationHourly = num(K.probationHourly, DEFAULTS.probationHourly);
    const probationMaxLinks = num(K.probationMaxLinks, DEFAULTS.probationMaxLinks);
    const trustedMaxLinks = num(K.trustedMaxLinks, DEFAULTS.trustedMaxLinks);
    const minSubmitSec = num(K.minSubmitSec, DEFAULTS.minSubmitSec);
    const holdFirstN = num(K.holdFirstN, DEFAULTS.holdFirstN);

    return {
        postCooldownSec,
        postHourly,
        threadCooldownSec,
        threadHourly,
        postCooldownMs: postCooldownSec * 1000,
        threadCooldownMs: threadCooldownSec * 1000,
        probationHours,
        probationMs: probationHours * 3_600_000,
        probationHourly,
        probationMaxLinks,
        trustedMaxLinks,
        minSubmitSec,
        minSubmitMs: minSubmitSec * 1000,
        holdFirstN,
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