// src/components/maintenance/MaintenanceScreen.tsx
import Countdown from "./Countdown";
import { getMaintenance } from "@/lib/maintenance";
import "./maintenance.css";

export default async function MaintenanceScreen() {
    const { endsAt, message } = await getMaintenance();

    return (
        <div className="mnt">
            <div className="mnt-card">
                <p className="mnt-mark">veganeating</p>
                <h1 className="mnt-title">We’re cooking something good.</h1>
                <p className="mnt-copy">
                    {message ||
                        "The kitchen’s closed for a quick refresh. Eat green, feel green — we’ll be back on the menu shortly."}
                </p>
                <Countdown target={endsAt} />
            </div>
        </div>
    );
}