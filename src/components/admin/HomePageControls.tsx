// src/components/admin/HomePageControls.tsx
"use client";

import { useState, useTransition } from "react";
import { setHomeLead } from "@/lib/actions/home";
import type { HomeLead } from "@/lib/home-config";
import "./maintenance-controls.css";

export default function HomePageControls({ initial }: { initial: HomeLead }) {
    const [lead, setLead] = useState<HomeLead>(initial);
    const [pending, startTransition] = useTransition();

    // Switch ON = recipe banner (the safe fallback). OFF = Instagram carousel.
    const banner = lead === "banner";

    function toggle() {
        const next: HomeLead = banner ? "carousel" : "banner";
        setLead(next); // optimistic
        startTransition(async () => {
            try {
                await setHomeLead(next);
            } catch {
                setLead(banner ? "banner" : "carousel"); // revert on failure
            }
        });
    }

    return (
        <div className="mc-card">
            <div className="mc-row">
                <div>
                    <div className="mc-row-title">
                        {banner ? "Recipe banner" : "Instagram carousel"}
                    </div>
                    <div className="mc-row-sub">
                        {banner
                            ? "Live — home leads with the big recipe banner (Hero)"
                            : "Live — home leads with the Instagram/recipe carousel"}
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={banner}
                    className={`mc-switch ${banner ? "on" : ""}`}
                    onClick={toggle}
                    disabled={pending}
                >
                    <span className="mc-knob" />
                </button>
            </div>
        </div>
    );
}
