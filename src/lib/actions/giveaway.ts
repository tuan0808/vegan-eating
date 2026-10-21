"use server";
// src/lib/actions/giveaway.ts — existing members entering the /whole-foods giveaway.
// New people go through localRegisterAction (account + entry in one step); a
// signed-in member only adds their IG handle + ZIP here.
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getLocalConfig, giveawayStatus, marketForZip, normalizeIgHandle, normalizeZip } from "@/lib/local-markets";

export async function enterGiveawayAction(formData: FormData) {
    const me = await requireUser();
    const igHandle = normalizeIgHandle(String(formData.get("igHandle") ?? ""));
    const zipCode = normalizeZip(String(formData.get("zipCode") ?? ""));
    if (!igHandle) redirect("/whole-foods?error=ig");
    if (!zipCode) redirect("/whole-foods?error=zip");
    // Same rule as signup: one account per IG handle.
    const clash = await prisma.user.findFirst({ where: { igHandle, id: { not: me.id } }, select: { id: true } });
    if (clash) redirect("/whole-foods?error=igtaken");

    const cfg = await getLocalConfig();
    const row = await prisma.user.findUnique({ where: { id: me.id }, select: { giveawayEnteredAt: true } });
    await prisma.user.update({
        where: { id: me.id },
        data: {
            igHandle,
            zipCode,
            localMarket: marketForZip(cfg.markets, zipCode),
            // Keep the first entry time; entering twice doesn't move you in line.
            ...(!row?.giveawayEnteredAt && giveawayStatus(cfg.giveaway) === "open" ? { giveawayEnteredAt: new Date() } : {}),
        },
    });
    redirect("/whole-foods/next?member=1");
}
