// src/app/(app)/admin/socials/page.tsx — manage the social links on /links.
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { getSocials } from "@/lib/socials";
import SocialsEditor from "@/components/admin/SocialsEditor";
import "@/components/admin/settings.css";
import "@/components/admin/socials-admin.css";

export const metadata: Metadata = { title: "Socials — vegan eating" };
export const dynamic = "force-dynamic";

export default async function AdminSocialsPage() {
    await requireRole(["ADMIN"]);
    const links = await getSocials();

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>
            <p
                style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--terra, #c2603a)",
                }}
            >
                Admin · Socials
            </p>
            <section className="settings-section">
                <div className="settings-section-head">
                    <h2>Social profiles</h2>
                    <p>
                        The buttons on <Link href="/links" target="_blank">/links</Link> — the page the business-card QR code opens.
                        Paste a profile URL and hit +; the icon is picked from the link. Reorder, then Save.
                    </p>
                </div>
                <SocialsEditor initial={links} />
            </section>
        </div>
    );
}
