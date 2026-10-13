"use server";
// src/lib/actions/socials.ts — save the /links social profile list.
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-helpers";
import { saveSocials, MAX_SOCIALS } from "@/lib/socials";
import { normalizeSocialUrl } from "@/lib/social-platforms";

export type SaveState = { ok: boolean; message: string | null; key?: number };

export async function saveSocialsAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
    try {
        await requireRole(["ADMIN"]);
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

    const urls: string[] = [];
    for (let i = 0; i < raw.length; i++) {
        const url = normalizeSocialUrl(String(raw[i] ?? ""));
        if (!url) return { ok: false, message: `Row ${i + 1}: that doesn't look like a valid URL.`, key: Date.now() };
        if (!urls.includes(url)) urls.push(url);
    }

    await saveSocials(urls);
    revalidatePath("/links");
    return { ok: true, message: `Saved ${urls.length} link${urls.length === 1 ? "" : "s"}.`, key: Date.now() };
}
