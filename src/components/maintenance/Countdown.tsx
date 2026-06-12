// src/components/maintenance/Countdown.tsx
"use client";

import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function diff(target: number): Parts {
    const ms = Math.max(0, target - Date.now());
    const s = Math.floor(ms / 1000);
    return {
        days: Math.floor(s / 86400),
        hours: Math.floor((s % 86400) / 3600),
        minutes: Math.floor((s % 3600) / 60),
        seconds: s % 60,
    };
}

export default function Countdown({ target }: { target: string | null }) {
    const targetMs = target ? new Date(target).getTime() : NaN;
    const [parts, setParts] = useState<Parts | null>(null);

    useEffect(() => {
        if (Number.isNaN(targetMs)) return;
        setParts(diff(targetMs));
        const id = setInterval(() => setParts(diff(targetMs)), 1000);
        return () => clearInterval(id);
    }, [targetMs]);

    // Render nothing until mounted — avoids a server/client hydration mismatch on the seconds.
    if (Number.isNaN(targetMs) || !parts) return null;

    const done =
        parts.days === 0 && parts.hours === 0 && parts.minutes === 0 && parts.seconds === 0;

    if (done) return <p className="mnt-back">We’re back online — refresh the page.</p>;

    const cells: [number, string][] = [
        [parts.days, "Days"],
        [parts.hours, "Hours"],
        [parts.minutes, "Min"],
        [parts.seconds, "Sec"],
    ];

    const eta = new Date(targetMs).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <div>
            <div className="mnt-clock" role="timer" aria-live="off">
                {cells.map(([value, label]) => (
                    <div className="mnt-cell" key={label}>
                        <span className="mnt-num">{String(value).padStart(2, "0")}</span>
                        <span className="mnt-label">{label}</span>
                    </div>
                ))}
            </div>
            <p className="mnt-eta">Back online {eta}</p>
        </div>
    );
}