// src/app/api/admin/local-export/route.ts — CSV of the Admin → Local signups view.
import type { NextRequest } from "next/server";
import { userWith } from "@/lib/permissions";
import { getLocalConfig } from "@/lib/local-markets";
import { isView, localMembers } from "@/lib/local-members";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
    const s = v instanceof Date ? v.toISOString() : String(v ?? "");
    // Quote everything; neutralise leading =+-@ so spreadsheets don't run it as a formula.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export async function GET(req: NextRequest): Promise<Response> {
    if (!(await userWith("local"))) return new Response("Forbidden", { status: 403 });
    const v = new URL(req.url).searchParams.get("view");
    const view = isView(v) ? v : "entries";
    const cfg = await getLocalConfig();
    const rows = await localMembers(view, cfg.giveaway);
    const name = (k: string | null) => (k ? cfg.markets.find((m) => m.key === k)?.name ?? k : "");

    const head = ["username", "email", "instagram", "ig_follow_verified", "zip", "market", "source", "email_verified", "entered_giveaway", "joined"];
    const lines = rows.map((r) =>
        [r.username, r.email, r.igHandle, r.igFollowVerifiedAt, r.zipCode, name(r.localMarket), r.signupSource ?? "site", r.emailVerified, r.giveawayEnteredAt, r.createdAt]
            .map(cell)
            .join(","),
    );
    return new Response([head.join(","), ...lines].join("\n"), {
        headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": `attachment; filename="local-${view}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
    });
}
