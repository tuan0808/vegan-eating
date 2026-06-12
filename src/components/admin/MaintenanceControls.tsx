// src/components/admin/MaintenanceControls.tsx
"use client";

import { useState, useTransition } from "react";
import {
    setMaintenanceEnabled,
    saveMaintenanceSchedule,
} from "@/lib/actions/maintenance";
import type { MaintenanceState } from "@/lib/maintenance";
import "./maintenance-controls.css";

function toLocalInput(iso: string | null): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
    )}:${pad(d.getMinutes())}`;
}

export default function MaintenanceControls({
                                                initial,
                                            }: {
    initial: MaintenanceState;
}) {
    const [enabled, setEnabled] = useState(initial.enabled);
    const [endsAt, setEndsAt] = useState(toLocalInput(initial.endsAt));
    const [message, setMessage] = useState(initial.message ?? "");
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function toggle() {
        const next = !enabled;
        setEnabled(next); // optimistic
        startTransition(async () => {
            try {
                await setMaintenanceEnabled(next);
            } catch {
                setEnabled(!next); // revert on failure
            }
        });
    }

    function save() {
        const iso = endsAt ? new Date(endsAt).toISOString() : "";
        startTransition(async () => {
            await saveMaintenanceSchedule(iso, message.trim());
            setSavedAt(new Date().toLocaleTimeString());
        });
    }

    return (
        <div className="mc-card">
            <div className="mc-row">
                <div>
                    <div className="mc-row-title">Maintenance mode</div>
                    <div className="mc-row-sub">
                        {enabled
                            ? "Live — visitors see the holding page"
                            : "Off — site is public"}
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    className={`mc-switch ${enabled ? "on" : ""}`}
                    onClick={toggle}
                    disabled={pending}
                >
                    <span className="mc-knob" />
                </button>
            </div>

            <label className="mc-field">
                <span>Back online at</span>
                <input
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                />
            </label>

            <label className="mc-field">
                <span>Message (optional)</span>
                <textarea
                    rows={3}
                    value={message}
                    placeholder="The kitchen’s closed for a quick refresh…"
                    onChange={(e) => setMessage(e.target.value)}
                />
            </label>

            <div className="mc-actions">
                <button
                    type="button"
                    className="mc-save"
                    onClick={save}
                    disabled={pending}
                >
                    {pending ? "Saving…" : "Save schedule"}
                </button>
                {savedAt && <span className="mc-saved">Saved at {savedAt}</span>}
            </div>
        </div>
    );
}