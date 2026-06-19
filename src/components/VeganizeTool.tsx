// src/components/VeganizeTool.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { veganizeRecipe, saveVeganizedRecipe } from "@/lib/actions/veganize";
import type { VeganizeResult } from "@/lib/veganize";

const GREEN = "var(--terra, #2F7D38)";
const CARROT = "var(--carrot, #E15A22)";
const INK = "var(--ink, #1c2317)";
const MUTED = "var(--muted, #6f7468)";
const LINE = "var(--line, rgba(27,42,29,.12))";

export default function VeganizeTool() {
    const [input, setInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<VeganizeResult | null>(null);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [remaining, setRemaining] = useState<number | null>(null);

    async function run(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim() || busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await veganizeRecipe(input);
            if (typeof res.remaining === "number") setRemaining(res.remaining);
            if (!res.ok || !res.result) {
                setError(res.error ?? "Something went wrong. Please try again.");
                return;
            }
            setResult(res.result);
            setRequestId(res.requestId ?? null);
        } catch {
            setError("Couldn't reach the kitchen. Please try again.");
        } finally {
            setBusy(false);
        }
    }

    function reset() {
        setResult(null);
        setRequestId(null);
        setSavedId(null);
        setError(null);
        setInput("");
    }

    async function save() {
        if (!requestId || saving || savedId) return;
        setSaving(true);
        setError(null);
        try {
            const res = await saveVeganizedRecipe(requestId);
            if (!res.ok || !res.submissionId) {
                setError(res.error ?? "Couldn't save. Please try again.");
                return;
            }
            setSavedId(res.submissionId);
        } catch {
            setError("Couldn't save. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    // ---------------- RESULT VIEW ----------------
    if (result) {
        return (
            <div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                        <span className="kicker" style={{ color: GREEN }}>Your recipe</span>
                        <h2 style={{ margin: "6px 0 4px", fontFamily: "var(--font-display, 'Fraunces', serif)", fontSize: 28, color: INK }}>
                            {result.title || "Your vegan recipe"}
                        </h2>
                        {result.summary && <p style={{ margin: 0, color: MUTED, lineHeight: 1.5 }}>{result.summary}</p>}
                    </div>
                    {remaining !== null && (
                        <span style={{ fontSize: 13, color: MUTED, whiteSpace: "nowrap" }}>{remaining} left today</span>
                    )}
                </div>

                {/* honesty banner */}
                <div style={{ marginTop: 16, padding: "11px 14px", borderRadius: 12, background: "rgba(225,90,34,.08)", border: `1px solid rgba(225,90,34,.25)`, color: INK, fontSize: 13.5, lineHeight: 1.5 }}>
                    <strong style={{ color: CARROT }}>AI suggestion — not yet tested.</strong>{" "}
                    This is a starting point from our kitchen assistant. Give it a cook, trust your taste, and tweak as you go.
                </div>

                {/* swap ledger (only when something was swapped) */}
                {result.swaps.length > 0 && (
                    <div style={{ marginTop: 22 }}>
                        <h3 style={{ fontFamily: "var(--font-display, 'Fraunces', serif)", fontSize: 19, margin: "0 0 12px", color: INK }}>The swaps</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {result.swaps.map((s, i) => (
                                <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--card, #fffdf7)", border: `1px solid ${LINE}` }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 15.5 }}>
                                        <span style={{ textDecoration: "line-through", color: MUTED }}>{s.original}</span>
                                        <span style={{ color: GREEN, fontWeight: 700 }}>→</span>
                                        <span style={{ fontWeight: 700, color: GREEN }}>{s.substitute}</span>
                                    </div>
                                    {s.reason && <p style={{ margin: "6px 0 0", color: INK, fontSize: 14, lineHeight: 1.5 }}>{s.reason}</p>}
                                    {s.tip && <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13, lineHeight: 1.5 }}><em>Tip: {s.tip}</em></p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ingredients */}
                {result.ingredients.length > 0 && (
                    <div style={{ marginTop: 22 }}>
                        <h3 style={{ fontFamily: "var(--font-display, 'Fraunces', serif)", fontSize: 19, margin: "0 0 10px", color: INK }}>Ingredients</h3>
                        <ul style={{ margin: 0, paddingLeft: 20, color: INK, lineHeight: 1.7 }}>
                            {result.ingredients.map((g, i) => <li key={i}>{g}</li>)}
                        </ul>
                    </div>
                )}

                {/* method */}
                {result.method.length > 0 && (
                    <div style={{ marginTop: 22 }}>
                        <h3 style={{ fontFamily: "var(--font-display, 'Fraunces', serif)", fontSize: 19, margin: "0 0 10px", color: INK }}>Method</h3>
                        <ol style={{ margin: 0, paddingLeft: 20, color: INK, lineHeight: 1.7 }}>
                            {result.method.map((m, i) => <li key={i} style={{ marginBottom: 6 }}>{m}</li>)}
                        </ol>
                    </div>
                )}

                {/* notes */}
                {result.notes.length > 0 && (
                    <div style={{ marginTop: 22 }}>
                        <h3 style={{ fontFamily: "var(--font-display, 'Fraunces', serif)", fontSize: 19, margin: "0 0 10px", color: INK }}>Good to know</h3>
                        <ul style={{ margin: 0, paddingLeft: 20, color: MUTED, lineHeight: 1.7 }}>
                            {result.notes.map((n, i) => <li key={i}>{n}</li>)}
                        </ul>
                    </div>
                )}

                {/* actions */}
                <div style={{ marginTop: 26, paddingTop: 18, borderTop: `1px solid ${LINE}` }}>
                    {error && <p style={{ color: "#c0392b", fontSize: 14, margin: "0 0 10px", fontWeight: 600 }}>{error}</p>}
                    {savedId ? (
                        <>
                            <p style={{ margin: "0 0 12px", color: GREEN, fontWeight: 600, fontSize: 14 }}>
                                ✓ Saved to your recipes — we&rsquo;ll review it before it can go live.
                            </p>
                            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                <Link
                                    href={`/submissions/${savedId}`}
                                    style={{ background: GREEN, color: "#fff", fontWeight: 600, fontSize: 15, padding: "11px 22px", borderRadius: 11, textDecoration: "none" }}
                                >
                                    View this recipe
                                </Link>
                                <button
                                    type="button"
                                    onClick={reset}
                                    style={{ cursor: "pointer", background: "transparent", color: INK, fontWeight: 600, fontSize: 15, padding: "11px 22px", borderRadius: 11, border: `1px solid ${LINE}`, fontFamily: "inherit" }}
                                >
                                    Make another
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <button
                                type="button"
                                onClick={save}
                                disabled={saving}
                                style={{ cursor: saving ? "default" : "pointer", background: GREEN, color: "#fff", border: 0, fontFamily: "inherit", fontWeight: 600, fontSize: 15, padding: "11px 22px", borderRadius: 11, opacity: saving ? 0.6 : 1 }}
                            >
                                {saving ? "Saving…" : "Save & test this"}
                            </button>
                            <button
                                type="button"
                                onClick={reset}
                                style={{ cursor: "pointer", background: "transparent", color: INK, fontWeight: 600, fontSize: 15, padding: "11px 22px", borderRadius: 11, border: `1px solid ${LINE}`, fontFamily: "inherit" }}
                            >
                                Make another
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ---------------- INPUT VIEW ----------------
    return (
        <form onSubmit={run}>
            <span className="kicker" style={{ color: GREEN }}>Kitchen assistant</span>
            <h2 style={{ margin: "6px 0 6px", fontFamily: "var(--font-display, 'Fraunces', serif)", fontSize: 28, color: INK }}>
                Cook with what you&rsquo;ve got
            </h2>
            <p style={{ margin: "0 0 16px", color: MUTED, lineHeight: 1.6 }}>
                List a few things from your fridge or pantry and we&rsquo;ll build you a vegan recipe — or paste a
                full recipe and we&rsquo;ll veganize it. Like what you get? Save it to your recipes in one tap.
            </p>

            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"List what you have, one per line…\n\ne.g.\nchickpeas\nspinach\nlemon\ngarlic\ncoconut milk\n\n…or paste a whole recipe to veganize."}
                rows={9}
                maxLength={6000}
                style={{ width: "100%", font: "inherit", border: `1px solid ${LINE}`, borderRadius: 12, padding: "13px 14px", minHeight: 180, resize: "vertical", background: "#fffefb", color: INK, lineHeight: 1.55, boxSizing: "border-box" }}
            />

            {error && <p style={{ color: "#c0392b", fontSize: 14, margin: "10px 0 0", fontWeight: 600 }}>{error}</p>}

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
                <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    style={{ cursor: busy || !input.trim() ? "default" : "pointer", background: GREEN, color: "#fff", border: 0, fontFamily: "inherit", fontWeight: 600, fontSize: 16, padding: "12px 28px", borderRadius: 11, opacity: busy || !input.trim() ? 0.55 : 1 }}
                >
                    {busy ? "Cooking it up…" : "Make my recipe"}
                </button>
                {remaining !== null && <span style={{ fontSize: 13, color: MUTED }}>{remaining} left today</span>}
            </div>
        </form>
    );
}