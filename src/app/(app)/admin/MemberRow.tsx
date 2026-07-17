// src/app/(app)/admin/MemberRow.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMember, deleteMember } from "./actions";

export type Member = {
    id: string;
    name: string | null;
    username: string;
    email: string;
    role: string;
    banned: boolean;
    joined: string;
    lastLogin: string | null;
    lastLoginIp: string | null;
    signupIp: string | null;
};

const ROLES = ["MEMBER", "MODERATOR", "ADMIN"];

function roleColor(role: string): string {
    if (role === "ADMIN") return "#c2603a";
    if (role === "MODERATOR") return "#c79a3c";
    return "#5b6b3f";
}

export default function MemberRow({ member, isMe }: { member: Member; isMe: boolean }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [pending, start] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(member.name ?? "");
    const [username, setUsername] = useState(member.username);
    const [email, setEmail] = useState(member.email);
    const [role, setRole] = useState(member.role);
    const [banned, setBanned] = useState(member.banned);

    const display = member.name ?? member.username;

    const cancel = () => {
        setName(member.name ?? "");
        setUsername(member.username);
        setEmail(member.email);
        setRole(member.role);
        setBanned(member.banned);
        setError(null);
        setEditing(false);
    };

    const save = () =>
        start(async () => {
            setError(null);
            const res = await updateMember(member.id, { name, username, email, role, banned });
            if (res.ok) {
                setEditing(false);
                router.refresh();
            } else {
                setError(res.error ?? "Couldn't save.");
            }
        });

    const remove = () =>
        start(async () => {
            if (!confirm(`Permanently delete @${member.username} and all their content? This can't be undone.`)) return;
            setError(null);
            const res = await deleteMember(member.id);
            if (res.ok) router.refresh();
            else setError(res.error ?? "Couldn't delete.");
        });

    return (
        <div className="am-row" style={row}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ ...avatar, background: roleColor(member.role) }}>{display.charAt(0).toUpperCase()}</span>

                <div className="am-info" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--ink, #1c2317)" }}>
                        {display} {isMe ? <span style={muted}>(you)</span> : null}
                        <span style={muted}> · @{member.username}</span>
                        {member.banned ? <span style={bannedBadge}>banned</span> : null}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted, #6b7264)" }}>
                        {member.email} · joined {member.joined}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted, #6b7264)", marginTop: 2 }}>
                        {member.lastLogin ? `Last login ${member.lastLogin}` : "Never logged in"}
                        {member.lastLoginIp ? ` · login IP ${member.lastLoginIp}` : ""}
                        {member.signupIp ? ` · signup IP ${member.signupIp}` : ""}
                    </div>
                </div>

                <span style={{ ...pill, color: roleColor(member.role), borderColor: roleColor(member.role) }}>{member.role}</span>

                <div style={{ display: "flex", gap: 8, width: 180, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => (editing ? cancel() : setEditing(true))} style={ghostBtn} disabled={pending}>
                        {editing ? "Close" : "Edit"}
                    </button>
                    {!isMe && (
                        <button type="button" onClick={remove} style={delBtn} disabled={pending}>Delete</button>
                    )}
                </div>
            </div>

            {editing && (
                <div style={editor}>
                    <div style={grid}>
                        <label style={field}>
                            <span style={label}>Display name</span>
                            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="—" style={input} />
                        </label>
                        <label style={field}>
                            <span style={label}>Username</span>
                            <input value={username} onChange={(e) => setUsername(e.target.value)} style={input} />
                        </label>
                        <label style={field}>
                            <span style={label}>Email</span>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={input} />
                        </label>
                        <label style={field}>
                            <span style={label}>Role {isMe ? "(can't change your own)" : ""}</span>
                            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isMe} style={input}>
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </label>
                        <label style={{ ...field, flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" checked={banned} onChange={(e) => setBanned(e.target.checked)} disabled={isMe} />
                            <span style={label}>Banned {isMe ? "(can't ban yourself)" : ""}</span>
                        </label>
                    </div>

                    {error ? <p style={errStyle}>{error}</p> : null}

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button type="button" onClick={save} disabled={pending} style={saveBtn}>
                            {pending ? "Saving…" : "Save changes"}
                        </button>
                        <button type="button" onClick={cancel} disabled={pending} style={ghostBtn}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

const row: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 14,
    padding: "14px 18px", background: "#faf8f1",
    border: "1px solid var(--line, #e6e3da)", borderRadius: 14,
};
const muted: React.CSSProperties = { color: "var(--muted,#6b7264)", fontWeight: 400 };
const avatar: React.CSSProperties = {
    flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontFamily: 'var(--display, "Fraunces", serif)', fontSize: 17, fontWeight: 600,
};
const pill: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em",
    border: "1px solid", borderRadius: 999, padding: "3px 10px", flexShrink: 0,
};
const bannedBadge: React.CSSProperties = {
    marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "1px 8px",
    borderRadius: 999, background: "#f6d9d3", color: "#9a3f1f",
};
const ghostBtn: React.CSSProperties = {
    border: "1px solid var(--line, #d9d5c8)", borderRadius: 999, padding: "7px 14px",
    fontSize: 13.5, fontWeight: 600, background: "#fff", color: "var(--ink,#1c2317)", cursor: "pointer",
};
const delBtn: React.CSSProperties = {
    border: "none", borderRadius: 999, padding: "7px 14px",
    fontSize: 13.5, fontWeight: 600, background: "#b23b2e", color: "#fff", cursor: "pointer",
};
const saveBtn: React.CSSProperties = {
    border: "none", borderRadius: 999, padding: "7px 16px",
    fontSize: 13.5, fontWeight: 600, background: "var(--terra, #c2603a)", color: "#fff", cursor: "pointer",
};
const editor: React.CSSProperties = {
    borderTop: "1px dashed var(--line,#e0dccf)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 12,
};
const grid: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12,
};
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--ink, #1c2317)" };
const input: React.CSSProperties = {
    border: "1px solid var(--line, #d9d5c8)", borderRadius: 8, padding: "8px 10px",
    fontSize: 14, background: "#fff", color: "var(--ink, #1c2317)",
};
const errStyle: React.CSSProperties = {
    background: "rgba(194,96,58,0.10)", border: "1px solid rgba(194,96,58,0.35)",
    color: "#9a3f1f", fontSize: 13.5, borderRadius: 8, padding: "8px 12px", margin: 0,
};
