"use server";
// src/lib/actions/vendor-config.ts — Admin → Vendor deals: save the vendor list
// and promo codes. Permission-gated ("vendors"); stored via vendor-config.ts.
import { revalidatePath } from "next/cache";
import { userWith } from "@/lib/permissions";
import { getVendorConfig, saveVendorConfig, MAX_VENDORS, MAX_FIELD, type Vendor } from "@/lib/vendor-config";

export type SaveState = { ok: boolean; message: string | null; key?: number };

const clip = (s: unknown): string => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_FIELD);

export async function saveVendorsAction(fd: FormData): Promise<SaveState> {
    const u = await userWith("vendors");
    if (!u) return { ok: false, message: "You don't have permission to change this.", key: Date.now() };

    let parsed: { vendors?: unknown; dealsHref?: unknown };
    try {
        parsed = JSON.parse(String(fd.get("config") ?? "{}"));
    } catch {
        return { ok: false, message: "Couldn't read the form data.", key: Date.now() };
    }

    const rows = Array.isArray(parsed.vendors) ? parsed.vendors : [];
    if (rows.length > MAX_VENDORS) return { ok: false, message: `Too many vendors (max ${MAX_VENDORS}).`, key: Date.now() };

    const vendors: Vendor[] = [];
    try {
        rows.forEach((r, i) => {
            const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
            const name = clip(o.name);
            if (!name) return; // skip blank rows rather than erroring
            const code = clip(o.code);
            const prominent = !!o.prominent;
            // A prominent vendor with no code would render a lonely "members only"
            // row with nothing to reveal — surface that instead of saving it silently.
            if (prominent && !code) throw new Error(`"${name}" is marked prominent but has no promo code.`);
            vendors.push({
                id: clip(o.id) || `v-${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}`,
                name,
                url: clip(o.url) || undefined,
                code,
                blurb: clip(o.blurb) || undefined,
                prominent,
            });
        });
    } catch (e) {
        return { ok: false, message: (e as Error).message, key: Date.now() };
    }

    const current = await getVendorConfig();
    const dealsHref = clip(parsed.dealsHref) || current.dealsHref || "/forum";

    await saveVendorConfig({
        vendors,
        dealsHref,
        updatedAt: new Date().toISOString(),
        updatedBy: u.username ?? u.email ?? undefined,
    });

    // The nav reads /api/vendors (dynamic), but revalidate the pages that embed
    // vendor data so any cached shells refresh too.
    ["/", "/forum", "/admin/vendors"].forEach((p) => revalidatePath(p));

    const prominent = vendors.filter((v) => v.prominent).length;
    return {
        ok: true,
        message: `Saved — ${vendors.length} vendor${vendors.length === 1 ? "" : "s"} (${prominent} in the nav).`,
        key: Date.now(),
    };
}
