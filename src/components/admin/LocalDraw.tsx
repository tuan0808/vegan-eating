// src/components/admin/LocalDraw.tsx — pick a random giveaway winner, check IG, redraw.
"use client";

import { useState, useTransition } from "react";
import { drawWinnerAction, setIgVerifiedAction, type DrawResult } from "@/lib/actions/local-admin";

export default function LocalDraw({ markets }: { markets: { key: string; name: string }[] }) {
    const [market, setMarket] = useState("local");
    const [result, setResult] = useState<DrawResult | null>(null);
    const [skipped, setSkipped] = useState<string[]>([]);
    const [confirmed, setConfirmed] = useState(false);
    const [pending, start] = useTransition();

    const draw = (exclude: string[]) =>
        start(async () => {
            setConfirmed(false);
            setResult(await drawWinnerAction(market, exclude));
        });

    const winner = result?.ok ? result.winner : null;

    return (
        <div className="la-box">
            <div className="la-row">
                <label className="la-field">
                    Draw from
                    <select value={market} onChange={(e) => { setMarket(e.target.value); setSkipped([]); setResult(null); }}>
                        <option value="local">All local entries</option>
                        {markets.map((m) => <option key={m.key} value={m.key}>{m.name} only</option>)}
                        <option value="all">Everyone (local or not)</option>
                    </select>
                </label>
                <button type="button" className="la-btn is-carrot" disabled={pending} onClick={() => { setSkipped([]); draw([]); }}>
                    {pending ? "Drawing…" : "Draw a winner"}
                </button>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)" }}>
                Eligible = entered during the giveaway window, verified email, gave an IG handle, not banned. Nothing is
                saved until you confirm the follow.
            </p>

            {result && !result.ok && <p className="la-msg is-err">{result.message}</p>}

            {winner && (
                <div className="la-winner">
                    <h3>@{winner.username}</h3>
                    <p>{winner.email}</p>
                    <p>
                        IG: <a href={`https://www.instagram.com/${winner.igHandle}/`} target="_blank" rel="noopener noreferrer"><b>@{winner.igHandle}</b></a>
                        {" · "}ZIP {winner.zipCode ?? "—"} · {winner.market ? markets.find((m) => m.key === winner.market)?.name ?? winner.market : "not local"}
                    </p>
                    <p style={{ color: "var(--muted)", fontSize: 13 }}>
                        Picked from {result!.ok ? result!.pool : 0} eligible entr{result!.ok && result!.pool === 1 ? "y" : "ies"}. Open their profile and
                        check they follow @veganeating_com.
                    </p>
                    <div className="la-row" style={{ marginTop: 10 }}>
                        {confirmed ? (
                            <span className="la-pill">✓ Follow confirmed — winner</span>
                        ) : (
                            <>
                                <button type="button" className="la-btn" disabled={pending} onClick={() => start(async () => { const r = await setIgVerifiedAction(winner.id, true); setConfirmed(r.ok); })}>
                                    They follow us — confirm
                                </button>
                                <button type="button" className="la-btn is-ghost" disabled={pending} onClick={() => { const next = [...skipped, winner.id]; setSkipped(next); draw(next); }}>
                                    Not following — redraw
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
