// src/app/(app)/admin/AddMemberForm.tsx
"use client";

// Admin "Add member": create an account directly (verified, ready to log in) and
// hand the person their username + password, instead of asking them to sign up.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMember } from "./actions";

const ROLES = ["MEMBER", "STAFF", "MEDIA", "MODERATOR", "ADMIN"];

/** 14 chars from an alphabet without look-alikes (0/O, 1/l/I), so it's easy to read out. */
function generatePassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint32Array(14));
    return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export default function AddMemberForm() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [pending, start] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<{ username: string; email: string; password: string } | null>(null);

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("STAFF");
    const [password, setPassword] = useState(generatePassword);

    const reset = () => {
        setName("");
        setUsername("");
        setEmail("");
        setRole("STAFF");
        setPassword(generatePassword());
        setError(null);
    };

    const save = () =>
        start(async () => {
            setError(null);
            const res = await createMember({ name, username, email, role, password });
            if (res.ok) {
                setCreated({ username: username.trim(), email: email.trim().toLowerCase(), password });
                reset();
                setOpen(false);
                router.refresh();
            } else {
                setError(res.error ?? "Couldn't create the account.");
            }
        });

    const loginDetails = created
        ? `Your vegan eating account is ready.\nLog in: ${window.location.origin}/login\nEmail: ${created.email}\nPassword: ${created.password}\nYou can change your password in Settings after logging in.`
        : "";

    return (
        <div style={{ marginTop: 18 }}>
            {created && (
                <div style={notice}>
                    <div style={{ fontWeight: 600 }}>Created @{created.username}. Send them these login details:</div>
                    <pre style={pre}>{loginDetails}</pre>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" style={saveBtn} onClick={() => navigator.clipboard.writeText(loginDetails)}>
                            Copy
                        </button>
                        <button type="button" style={ghostBtn} onClick={() => setCreated(null)}>Done</button>
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--muted, #6b7264)" }}>
                        The password isn&apos;t shown again after you close this.
                    </div>
                </div>
            )}

            {!open ? (
                <button type="button" style={saveBtn} onClick={() => setOpen(true)}>+ Add member</button>
            ) : (
                <div style={panel}>
                    <div style={grid}>
                        <label style={field}>
                            <span style={label}>Username</span>
                            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="jane_doe" style={input} />
                        </label>
                        <label style={field}>
                            <span style={label}>Email</span>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={input} />
                        </label>
                        <label style={field}>
                            <span style={label}>Display name (optional)</span>
                            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={input} />
                        </label>
                        <label style={field}>
                            <span style={label}>Role</span>
                            <select value={role} onChange={(e) => setRole(e.target.value)} style={input}>
                                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </label>
                        <label style={field}>
                            <span style={label}>Password</span>
                            <span style={{ display: "flex", gap: 6 }}>
                                <input
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ ...input, flex: 1, minWidth: 0, fontFamily: "monospace" }}
                                />
                                <button type="button" style={ghostBtn} onClick={() => setPassword(generatePassword())} title="Generate a new password">
                                    New
                                </button>
                            </span>
                        </label>
                    </div>

                    <p style={{ fontSize: 12.5, color: "var(--muted, #6b7264)", margin: 0 }}>
                        The account is created already verified, so they can log in right away.
                    </p>
                    {error ? <p style={errStyle}>{error}</p> : null}

                    <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" onClick={save} disabled={pending} style={saveBtn}>
                            {pending ? "Creating…" : "Create account"}
                        </button>
                        <button type="button" onClick={() => { reset(); setOpen(false); }} disabled={pending} style={ghostBtn}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const panel: React.CSSProperties = {
    display: "flex", flexDirection: "column", gap: 12,
    padding: "16px 18px", background: "#faf8f1",
    border: "1px solid var(--line, #e6e3da)", borderRadius: 14,
};
const notice: React.CSSProperties = {
    ...panel, marginBottom: 12, background: "rgba(91,107,63,0.08)", borderColor: "rgba(91,107,63,0.35)",
};
const pre: React.CSSProperties = {
    margin: 0, padding: "10px 12px", background: "#fff", border: "1px solid var(--line, #e6e3da)",
    borderRadius: 8, fontSize: 13, whiteSpace: "pre-wrap", wordBreak: "break-all",
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
const ghostBtn: React.CSSProperties = {
    border: "1px solid var(--line, #d9d5c8)", borderRadius: 999, padding: "7px 14px",
    fontSize: 13.5, fontWeight: 600, background: "#fff", color: "var(--ink,#1c2317)", cursor: "pointer",
};
const saveBtn: React.CSSProperties = {
    border: "none", borderRadius: 999, padding: "8px 16px",
    fontSize: 13.5, fontWeight: 600, background: "var(--terra, #c2603a)", color: "#fff", cursor: "pointer",
};
const errStyle: React.CSSProperties = {
    background: "rgba(194,96,58,0.10)", border: "1px solid rgba(194,96,58,0.35)",
    color: "#9a3f1f", fontSize: 13.5, borderRadius: 8, padding: "8px 12px", margin: 0,
};
