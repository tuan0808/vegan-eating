// src/components/admin/VeganizeLimits.tsx
import Link from "next/link";
import { getVeganizeCaps } from "@/lib/veganize-admin";
import VeganizeLimitsForm from "./VeganizeLimitsForm";
import "./antispam-panel.css"; // same chrome as the Anti-spam panel above it

export default async function VeganizeLimits() {
    const caps = await getVeganizeCaps();

    return (
        <section className="as-panel">
            <div
                className="as-head"
                style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <span className="as-kicker">Veganizer</span>
                    <h2 className="as-title">Limits</h2>
                </div>
                <Link
                    href="/admin/veganize"
                    style={{ fontSize: 14, fontWeight: 600, color: "var(--terra, #2F7D38)", textDecoration: "none" }}
                >
                    View generation log →
                </Link>
            </div>

            <VeganizeLimitsForm caps={caps} />
        </section>
    );
}