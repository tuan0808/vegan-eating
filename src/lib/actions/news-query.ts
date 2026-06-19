// src/lib/actions/news-query.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import {
    DEFAULT_NEWS_QUERY,
    NEWS_QUERY_SETTING_KEY,
    parseNewsQueryInput,
} from "@/lib/news-query";

export type SaveState = { ok: boolean; message: string | null; key?: number };

/**
 * Save or reset the newsdata.io query. The clicked button supplies action=save
 * or action=reset. The API key is stripped on the way in (see parseNewsQueryInput)
 * so it can never be persisted.
 */
export async function saveNewsQuery(_prev: SaveState, formData: FormData): Promise<SaveState> {
    // Outside the try so the admin-gate redirect propagates, not caught as an error.
    await requireRole(["ADMIN"]);

    const mode = String(formData.get("action") ?? "save");

    try {
        if (mode === "reset") {
            await prisma.setting.upsert({
                where: { key: NEWS_QUERY_SETTING_KEY },
                create: { key: NEWS_QUERY_SETTING_KEY, value: DEFAULT_NEWS_QUERY },
                update: { value: DEFAULT_NEWS_QUERY },
            });
            revalidatePath("/admin/news");
            return { ok: true, message: "Reset to default.", key: Date.now() };
        }

        const cleaned = parseNewsQueryInput(String(formData.get("query") ?? ""));
        if (!cleaned) {
            return { ok: false, message: "Couldn't read that — paste the params or the full URL.", key: Date.now() };
        }

        await prisma.setting.upsert({
            where: { key: NEWS_QUERY_SETTING_KEY },
            create: { key: NEWS_QUERY_SETTING_KEY, value: cleaned },
            update: { value: cleaned },
        });
        revalidatePath("/admin/news");
        return { ok: true, message: "Query saved.", key: Date.now() };
    } catch (e) {
        console.error("saveNewsQuery failed:", e);
        return { ok: false, message: "Couldn't save — try again.", key: Date.now() };
    }
}