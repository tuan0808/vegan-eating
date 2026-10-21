// src/components/admin/LocalConfigEditor.tsx — markets (ZIP lists) + giveaway dates.
"use client";

import { useState, useTransition } from "react";
import { saveLocalConfigAction, type SaveState } from "@/lib/actions/local-admin";
import type { LocalConfig } from "@/lib/local-markets";

type Row = { key: string; name: string; zips: string };

export default function LocalConfigEditor({ initial }: { initial: LocalConfig }) {
    const [rows, setRows] = useState<Row[]>(initial.markets.map((m) => ({ key: m.key, name: m.name, zips: m.zips.join(", ") })));
    const [g, setG] = useState(initial.giveaway);
    const [state, setState] = useState<SaveState | null>(null);
    const [pending, start] = useTransition();

    const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    const move = (i: number, d: number) => setRows((r) => { const n = [...r]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); return n; });

    const save = () =>
        start(async () => {
            setState(await saveLocalConfigAction({
                markets: rows.map((r) => ({ key: r.key, name: r.name, zips: r.zips.split(/[\s,]+/).filter(Boolean) })),
                giveaway: g,
            }));
        });

    return (
        <div className="la-box">
            <div className="la-row">
                <label className="la-field">Giveaway name<input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} maxLength={80} /></label>
                <label className="la-field">Entries open<input type="date" value={g.start} onChange={(e) => setG({ ...g, start: e.target.value })} /></label>
                <label className="la-field">Last day to enter<input type="date" value={g.end} onChange={(e) => setG({ ...g, end: e.target.value })} /></label>
                <label className="la-field">Drawing<input type="date" value={g.drawDate} onChange={(e) => setG({ ...g, drawDate: e.target.value })} /></label>
            </div>

            {rows.map((r, i) => (
                <div key={i} className="la-market">
                    <div className="la-row">
                        <label className="la-field" style={{ flex: 1 }}>Market {i + 1}{i === 0 ? " (checked first)" : ""}<input value={r.name} onChange={(e) => set(i, { name: e.target.value })} maxLength={60} /></label>
                        <button type="button" className="la-btn is-ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                        <button type="button" className="la-btn is-ghost" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                        <button type="button" className="la-btn is-ghost" onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                    <label className="la-field">ZIP codes ({r.zips.split(/[\s,]+/).filter(Boolean).length})<textarea value={r.zips} onChange={(e) => set(i, { zips: e.target.value })} /></label>
                </div>
            ))}

            <div className="la-row">
                <button type="button" className="la-btn is-ghost" onClick={() => setRows((x) => [...x, { key: "", name: "", zips: "" }])}>+ Add market</button>
                <button type="button" className="la-btn" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
                {state?.message && <span className={`la-msg ${state.ok ? "" : "is-err"}`}>{state.message}</span>}
            </div>
        </div>
    );
}
