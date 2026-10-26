// src/components/admin/CampaignEditorPage.tsx — shared shell for Admin → Campaign → Whole Foods / Official Rules.
import Link from "next/link";
import type { GiveawayContent } from "@/lib/giveaway-content";
import GiveawayContentEditor from "@/components/admin/GiveawayContentEditor";
import "@/components/admin/settings.css";
import "@/components/admin/local-admin.css";

export default function CampaignEditorPage({ section, content: c }: { section: "page" | "rules"; content: GiveawayContent }) {
    const rules = section === "rules";
    const href = rules ? "/whole-foods/rules" : "/whole-foods";
    const updated = c.updatedAt
        ? new Date(c.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })
        : null;

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--terra, #c2603a)" }}>
                Campaign · {rules ? "Official Rules" : "Whole Foods"}
            </p>
            <section className="settings-section">
                <div className="settings-section-head">
                    <h2>{rules ? "Official rules" : "Whole Foods giveaway page"}</h2>
                    <p>
                        The wording on <Link href={href} target="_blank">{href}</Link>
                        {rules ? "" : " (the page the in-store QR code opens)"}. Saving puts it live right away — no deploy.
                        Dates and markets are set in <Link href="/admin/local">Local signups</Link>.{" "}
                        {updated ? `Last saved ${updated} ET${c.updatedBy ? ` by ${c.updatedBy}` : ""}.` : "Showing the original wording."}
                    </p>
                </div>
                <GiveawayContentEditor section={section} initial={c} />
            </section>
        </div>
    );
}
