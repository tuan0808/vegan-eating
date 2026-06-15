// src/app/(app)/settings/page.tsx   ← put this wherever your Settings route actually lives
import { currentUser } from "@/lib/auth-helpers";
import MaintenanceSection from "@/components/admin/MaintenanceSection";
import "@/components/admin/settings.css";

export const metadata = { title: "Settings — vegan eating" };

export default async function SettingsPage() {
    const user = await currentUser();
    const isAdmin = user?.role === "ADMIN";

    return (
        <div className="settings-page">
            <div className="settings-head">
                <p style={kicker}>Account</p>
                <h1 style={h1}>Settings</h1>
                <p className="settings-desc">
                    {isAdmin
                        ? "Site-wide controls. More options coming soon."
                        : "More options coming soon."}
                </p>
            </div>

            {/* Site-wide maintenance is an admin-only control. Non-admins never see it —
                but the toggle's server action must ALSO check role server-side. */}
            {isAdmin && <MaintenanceSection />}
        </div>
    );
}
const kicker: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--terra, #c2603a)",
};
const h1: React.CSSProperties = {
    fontFamily: 'var(--display, "Fraunces", serif)',
    fontSize: 32,
    color: "var(--ink, #1c2317)",
    margin: "8px 0 0",
};
const pill: React.CSSProperties = {
    display: "inline-block",
    background: "rgba(91,107,63,0.15)",
    color: "#41502a",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 13,
    fontWeight: 600,
};