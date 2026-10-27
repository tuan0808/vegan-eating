"use server";
// src/lib/actions/local-admin.ts — Admin → Local signups: markets/dates, IG-follow
// checks, and the giveaway draw.
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { enteredInWindow, getLocalConfig, saveLocalConfig, type LocalConfig, type Market } from "@/lib/local-markets";

export type SaveState = { ok: boolean; message: string | null; key?: number };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function saveLocalConfigAction(config: LocalConfig): Promise<SaveState> {
    try { await requirePermission("local"); } catch { return { ok: false, message: "Not allowed.", key: Date.now() }; }

    const markets: Market[] = [];
    const seen = new Set<string>();
    for (const m of config.markets) {
        const name = String(m.name ?? "").trim().slice(0, 60);
        const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (!name || !key) return { ok: false, message: "Every market needs a name.", key: Date.now() };
        if (seen.has(key)) return { ok: false, message: `Two markets are named "${name}".`, key: Date.now() };
        seen.add(key);
        const zips = Array.from(new Set(m.zips.map((z) => String(z).trim()).filter(Boolean)));
        const bad = zips.find((z) => !/^\d{5}$/.test(z));
        if (bad) return { ok: false, message: `${name}: "${bad}" isn't a 5-digit ZIP.`, key: Date.now() };
        // Keep an existing market's key when renamed, so members' stored market survives.
        markets.push({ key: m.key && /^[a-z0-9-]+$/.test(m.key) ? m.key : key, name, zips });
    }

    const g = config.giveaway;
    if (![g.start, g.end, g.drawDate].every((d) => YMD.test(d))) return { ok: false, message: "Dates must be YYYY-MM-DD.", key: Date.now() };
    if (g.end < g.start) return { ok: false, message: "The entry cutoff is before the start date.", key: Date.now() };

    const changed = await saveLocalConfig({ markets, giveaway: { ...g, name: String(g.name ?? "").trim().slice(0, 80) || "Giveaway" } });
    revalidatePath("/admin/local");
    return { ok: true, message: `Saved.${changed ? ` ${changed} member${changed === 1 ? "" : "s"} re-sorted into markets.` : ""}`, key: Date.now() };
}

export async function setIgVerifiedAction(userId: string, verified: boolean): Promise<{ ok: boolean }> {
    try { await requirePermission("local"); } catch { return { ok: false }; }
    await prisma.user.update({ where: { id: userId }, data: { igFollowVerifiedAt: verified ? new Date() : null } });
    revalidatePath("/admin/local");
    return { ok: true };
}

export type DrawResult =
    | { ok: true; pool: number; winner: { id: string; username: string; email: string; igHandle: string | null; zipCode: string | null; market: string | null } }
    | { ok: false; message: string };

/**
 * Uniform random pick (crypto RNG) from eligible entries: entered during the
 * window, email verified, not banned (IG handle optional), and — when `market` is
 * set — in that market ("local" = any market). `exclude` = people already drawn
 * this session who failed the IG check.
 */
export async function drawWinnerAction(market: string, exclude: string[]): Promise<DrawResult> {
    try { await requirePermission("local"); } catch { return { ok: false, message: "Not allowed." }; }
    const { giveaway } = await getLocalConfig();
    const rows = await prisma.user.findMany({
        where: {
            giveawayEnteredAt: { not: null },
            emailVerified: { not: null },
            banned: false,
            ...(market === "local" ? { localMarket: { not: null } } : market !== "all" ? { localMarket: market } : {}),
            ...(exclude.length ? { id: { notIn: exclude } } : {}),
        },
        select: { id: true, username: true, email: true, igHandle: true, zipCode: true, localMarket: true, giveawayEnteredAt: true },
    });
    const pool = rows.filter((r) => enteredInWindow(giveaway, r.giveawayEnteredAt));
    if (pool.length === 0) return { ok: false, message: "No eligible entries left for that filter." };
    const w = pool[randomInt(pool.length)];
    return { ok: true, pool: pool.length, winner: { id: w.id, username: w.username, email: w.email, igHandle: w.igHandle, zipCode: w.zipCode, market: w.localMarket } };
}
