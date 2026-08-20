// src/app/(app)/admin/MembersView.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MemberRow, { type Member } from "./MemberRow";
import { blockBotMembers } from "./actions";

export type TabKey = "all" | "members" | "flagged" | "banned";
export type Counts = Record<TabKey, number>;

const TABS: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "members", label: "Members" },
    { key: "flagged", label: "Likely bots" },
    { key: "banned", label: "Banned" },
];

export default function MembersView({
    members,
    meId,
    tab,
    counts,
    selectable,
}: {
    members: Member[];
    meId: string;
    tab: TabKey;
    counts: Counts;
    selectable: boolean;
}) {
    const router = useRouter();
    const [sel, setSel] = useState<Set<string>>(new Set());
    const [pending, start] = useTransition();
    const [msg, setMsg] = useState<string | null>(null);

    // Everything selectable in this view except yourself.
    const selectableIds = members.filter((m) => m.id !== meId).map((m) => m.id);
    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => sel.has(id));

    const toggle = (id: string, on: boolean) =>
        setSel((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });
    const toggleAll = (on: boolean) => setSel(on ? new Set(selectableIds) : new Set());

    const blockSelected = () =>
        start(async () => {
            if (sel.size === 0) return;
            if (!confirm(`Ban ${sel.size} selected account${sel.size === 1 ? "" : "s"} and blocklist their signup IPs? You can unban individually later, but this hits all of them at once.`)) return;
            setMsg(null);
            const res = await blockBotMembers([...sel]);
            if (res.ok) {
                setSel(new Set());
                setMsg(`Blocked ${res.blocked} account${res.blocked === 1 ? "" : "s"}.`);
                router.refresh();
            } else {
                setMsg(res.error ?? "Couldn't block the selection.");
            }
        });

    return (
        <div>
            <div style={tabsBar}>
                {TABS.map((t) => {
                    const active = t.key === tab;
                    return (
                        <Link
                            key={t.key}
                            href={t.key === "all" ? "/admin" : `/admin?tab=${t.key}`}
                            style={{ ...tabStyle, ...(active ? tabActive : {}) }}
                        >
                            {t.label}
                            <span style={{ ...tabCount, ...(t.key === "flagged" && counts.flagged > 0 ? tabCountAlert : {}) }}>
                                {counts[t.key]}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {selectable && selectableIds.length > 0 ? (
                <div style={toolbar}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 14 }}>
                        <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} style={{ width: 17, height: 17 }} />
                        Select all ({selectableIds.length})
                    </label>
                    <div style={{ flex: 1 }} />
                    {msg ? <span style={{ fontSize: 13.5, color: "var(--muted, #6b7264)" }}>{msg}</span> : null}
                    <button type="button" onClick={blockSelected} disabled={pending || sel.size === 0} style={bulkBtn}>
                        {pending ? "Blocking…" : `Block + IP (${sel.size})`}
                    </button>
                </div>
            ) : null}

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                {members.length === 0 ? (
                    <p style={{ color: "var(--muted, #6b7264)" }}>No accounts in this view.</p>
                ) : (
                    members.map((m) => (
                        <MemberRow
                            key={m.id}
                            member={m}
                            isMe={m.id === meId}
                            selectable={selectable && m.id !== meId}
                            selected={sel.has(m.id)}
                            onToggle={(on) => toggle(m.id, on)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

const tabsBar: React.CSSProperties = {
    display: "flex", gap: 6, flexWrap: "wrap", marginTop: 22,
    borderBottom: "1px solid var(--line, #e6e3da)", paddingBottom: 12,
};
const tabStyle: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 7,
    padding: "7px 14px", borderRadius: 999, fontSize: 14, fontWeight: 600,
    color: "var(--muted, #6b7264)", background: "transparent", textDecoration: "none",
    border: "1px solid var(--line, #e6e3da)",
};
const tabActive: React.CSSProperties = {
    color: "#fff", background: "var(--terra, #c2603a)", borderColor: "var(--terra, #c2603a)",
};
const tabCount: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, padding: "0 7px", borderRadius: 999,
    background: "rgba(0,0,0,0.06)", minWidth: 20, textAlign: "center",
};
const tabCountAlert: React.CSSProperties = { background: "#fbe6c8", color: "#8a5a12" };
const toolbar: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    marginTop: 16, padding: "10px 14px",
    background: "#fbe6c8", border: "1px solid #e6c48a", borderRadius: 12,
};
const bulkBtn: React.CSSProperties = {
    border: "none", borderRadius: 999, padding: "8px 16px",
    fontSize: 13.5, fontWeight: 700, background: "#8a5a12", color: "#fff",
    cursor: "pointer", opacity: 1,
};
