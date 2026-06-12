// src/components/maintenance/MaintenanceScreen.tsx
import Countdown from "./Countdown";
import { getMaintenance } from "@/lib/maintenance";
import "./maintenance.css";

export default async function MaintenanceScreen() {
    const { endsAt, message, bgUrl } = await getMaintenance();

    return (
        <div className="mnt">
            <div
                className="mnt-bg"
                aria-hidden="true"
                style={bgUrl ? { backgroundImage: `url("${bgUrl}")` } : undefined}
            />
            <div className="mnt-overlay" aria-hidden="true" />

            <div className="mnt-card">
                <svg className="mnt-sprout" viewBox="0 0 64 72" fill="none" aria-hidden="true">
                    <path className="mnt-stem" d="M32 66 C32 52 32 44 32 34" />
                    <path className="mnt-leafshape" d="M32 40 C22 41 13.5 35 13 25 C24 24 31 30 32 40 Z" />
                    <path className="mnt-leafshape" d="M32 33 C42 34 50.5 28 51 18 C40 17 33 23 32 33 Z" />
                    <circle className="mnt-seed" cx="32" cy="67" r="3" />
                </svg>

                <p className="mnt-mark"><span aria-hidden="true">🥕</span> vegan eating</p>
                <h1 className="mnt-title">We’re tending the garden.</h1>
                <p className="mnt-copy">
                    {message ||
                        "Just a short break to plant something new. Eat green, feel green — we’ll be serving again soon."}
                </p>

                <Countdown target={endsAt} />

                <p className="mnt-tag">eat green, feel green</p>
            </div>
        </div>
    );
}