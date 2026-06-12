// src/app/(app)/settings/page.tsx   ← put this wherever your Settings route actually lives
import MaintenanceSection from "@/components/admin/MaintenanceSection";
import "@/components/admin/settings.css";

export const metadata = { title: "Settings — vegan eating" };

export default function SettingsPage() {
    return (
        <div className="settings-page">
            <div className="settings-head">
                <p className="settings-eyebrow">Account</p>
                <h1 className="settings-title">Settings</h1>
                <p className="settings-desc">Site-wide controls. More options coming soon.</p>
            </div>

            <MaintenanceSection />
        </div>
    );
}