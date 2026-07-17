// src/components/maintenance/Countdown.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
    const router = useRouter();
    const targetMs = target ? new Date(target).getTime() : NaN;
    const [parts, setParts] = useState<Parts | null>(null);

    useEffect(() => {
        if (Number.isNaN(targetMs)) return;
        setParts(diff(targetMs));
        const id = setInterval(() => setParts(diff(targetMs)), 1000);
        return () => clearInterval(id);
    }, [targetMs]);

    const done =
        !!parts && parts.days === 0 && parts.hours === 0 && parts.minutes === 0 && parts.seconds === 0;

    // Once the timer elapses, re-fetch the maintenance state instead of dead-ending on
    // "refresh the page": if the admin extended the window the countdown resumes with
    // the new target, and if maintenance was turned off the real site loads — no manual
    // refresh, and no getting stuck on a stale "back online" when a future date is set.
    useEffect(() => {
        if (!done) return;
        router.refresh();
        const id = setInterval(() => router.refresh(), 15000);
        return () => clearInterval(id);
    }, [done, router]);

    // Render nothing until mounted — avoids a server/client hydration mismatch on the seconds.
    if (Number.isNaN(targetMs) || !parts) return null;

    if (done) return <p className="mnt-back">Almost done — this page will refresh itself.</p>;

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