// src/app/(app)/admin/maintenance/page.tsx
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import MaintenanceSection from "@/components/admin/MaintenanceSection";
import EmailSettingsSection from "@/components/admin/EmailSettingsSection";

export const metadata: Metadata = { title: "Site settings — vegan eating" };
export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
    await requireRole(["ADMIN"]);

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
                Admin · Site settings
            </p>
            <MaintenanceSection />
            <EmailSettingsSection />
        </div>
    );
}