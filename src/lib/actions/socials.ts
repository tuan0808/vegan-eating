"use server";
// src/lib/actions/socials.ts — save the /links social profile list.
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { saveSocials, MAX_SOCIALS, type SocialEntry } from "@/lib/socials";
import { normalizeSocialUrl } from "@/lib/social-platforms";

export type SaveState = { ok: boolean; message: string | null; key?: number };

export async function saveSocialsAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
    try {
        await requirePermission("socials");
    } catch {
        return { ok: false, message: "You don't have permission to change this.", key: Date.now() };
    }

    let raw: unknown;
    try {
        raw = JSON.parse(String(formData.get("links") ?? "[]"));
    } catch {
        return { ok: false, message: "Could not read the link list.", key: Date.now() };
    }
    if (!Array.isArray(raw)) return { ok: false, message: "Could not read the link list.", key: Date.now() };
    if (raw.length > MAX_SOCIALS) return { ok: false, message: `At most ${MAX_SOCIALS} links.`, key: Date.now() };

    const entries: SocialEntry[] = [];
    for (let i = 0; i < raw.length; i++) {
        const row = raw[i] as { url?: unknown; hidden?: unknown } | null;
        const url = normalizeSocialUrl(String(row?.url ?? ""));
        if (!url) return { ok: false, message: `Row ${i + 1}: that doesn't look like a valid URL.`, key: Date.now() };
        if (!entries.some((e) => e.url === url)) entries.push({ url, hidden: row?.hidden === true });
    }

    await saveSocials(entries);
    revalidatePath("/links");
    const shown = entries.filter((e) => !e.hidden).length;
    const hidden = entries.length - shown;
    return {
        ok: true,
        message: `Saved ${shown} visible link${shown === 1 ? "" : "s"}${hidden ? `, ${hidden} hidden` : ""}.`,
        key: Date.now(),
    };
}
