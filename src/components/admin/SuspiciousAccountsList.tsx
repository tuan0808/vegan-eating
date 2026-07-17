// src/components/admin/SuspiciousAccountsList.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { banAccounts, unbanAccounts, deleteAccounts } from "@/lib/actions/accounts";

type Row = {
    id: string;
    username: string;
    name: string | null;
    email: string;
    joined: string;
    banned: boolean;
    signupIp: string | null;
    score: number;
    signals: string[];
};

export default function SuspiciousAccountsList({ accounts }: { accounts: Row[] }) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [pending, start] = useTransition();
    const router = useRouter();

    const count = selected.size;
    const allSelected = count > 0 && count === accounts.length;

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    const toggleAll = () =>
        setSelected(allSelected ? new Set() : new Set(accounts.map((a) => a.id)));

    const run = (fn: (ids: string[]) => Promise<unknown>, confirmMsg?: string) =>
        start(async () => {
            if (!count) return;
            if (confirmMsg && !confirm(confirmMsg)) return;
            await fn(Array.from(selected));
            setSelected(new Set());
            router.refresh();
        });

    return (
        <div>
            <div style={bar}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    Select all ({accounts.length})
                </label>
                <span style={{ flex: 1 }} />
                <button type="button" disabled={pending || !count} style={btn("#2f9e63")}
                        onClick={() => run(unbanAccounts)}>
                    Unban
                </button>
                <button type="button" disabled={pending || !count} style={btn("#c79a3c")}
                        onClick={() => run(banAccounts, `Ban ${count} account${count === 1 ? "" : "s"}? They won't be able to post or log in.`)}>
                    {pending ? "Working…" : `Ban (${count})`}
                </button>
                <button type="button" disabled={pending || !count} style={btn("#b23b2e")}
                        onClick={() => run(deleteAccounts, `Permanently DELETE ${count} account${count === 1 ? "" : "s"} and all their content? This cannot be undone.`)}>
                    Delete ({count})
                </button>
            </div>

            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {accounts.map((a) => {
                    const checked = selected.has(a.id);
                    return (
                        <li key={a.id} style={row(checked, a.banned)}>
                            <input type="checkbox" checked={checked} onChange={() => toggle(a.id)} style={{ marginTop: 3 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                                    <strong style={{ fontSize: 14 }}>@{a.username}</strong>
                                    {a.name ? <span style={{ color: "#6b7264", fontSize: 13 }}>{a.name}</span> : null}
                                    <span style={scoreChip(a.score)}>score {a.score}</span>
                                    {a.banned ? <span style={bannedChip}>banned</span> : null}
                                </div>
                                <div style={{ fontSize: 12.5, color: "#6b7264", marginTop: 2, wordBreak: "break-all" }}>
                                    {a.email} · joined {a.joined}{a.signupIp ? ` · IP ${a.signupIp}` : ""}
                                </div>
                                <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {a.signals.map((s, i) => (
                                        <li key={i} style={signalChip}>{s}</li>
                                    ))}
                                </ul>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

const bar: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    padding: "10px 0 14px", borderBottom: "1px solid #e6e3da", marginBottom: 12,
};
const btn = (bg: string): React.CSSProperties => ({
    background: bg, color: "#fff", border: "none", borderRadius: 999,
    padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
});
const row = (checked: boolean, banned: boolean): React.CSSProperties => ({
    display: "flex", gap: 10, alignItems: "flex-start",
    padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${checked ? "#c2603a" : "#e6e3da"}`,
    background: banned ? "#f6f4ee" : checked ? "#fdf6f2" : "#fff",
    opacity: banned ? 0.72 : 1,
});
const scoreChip = (score: number): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 999,
    background: score >= 5 ? "#f6d9d3" : "#fbeccb",
    color: score >= 5 ? "#9a3f1f" : "#8a5a00",
});
const bannedChip: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 999,
    background: "#e5e2da", color: "#555",
};
const signalChip: React.CSSProperties = {
    fontSize: 11.5, padding: "2px 8px", borderRadius: 6,
    background: "#f2efe6", color: "#4a5142", border: "1px solid #e2ddcf",
};
