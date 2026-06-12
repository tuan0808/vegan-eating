// src/components/admin/MaintenanceSection.tsx
import MaintenanceControls from "./MaintenanceControls";
import { getMaintenance } from "@/lib/maintenance";
import "./settings.css";

export default async function MaintenanceSection() {
    const state = await getMaintenance();

    return (
        <section className="settings-section">
            <div className="settings-section-head">
                <h2>Maintenance mode</h2>
                <p>
                    Flip the switch to show the holding page to the public. You keep full
                    access to the admin while it’s on.
                </p>
            </div>
            <MaintenanceControls initial={state} />
        </section>
    );
}