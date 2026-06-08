// src/app/(app)/dashboard/page.tsx
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Dashboard — vegan eating" };

export default async function DashboardPage() {
    const user = await requireUser();

    return (
        <div style={{ maxWidth: 820 }}>
            <p style={kicker}>Dashboard</p>
            <h1 style={h1}>Hi, {user.name ?? user.username}</h1>
            <p style={{ color: "var(--muted,#6b7264)", marginTop: 8 }}>
                Signed in as <strong>{user.email}</strong> · role{" "}
                <span style={pill}>{user.role}</span>
            </p>
            <p style={{ marginTop: 28, color: "var(--muted,#6b7264)", maxWidth: 560, lineHeight: 1.6 }}>
                This is your account home. Soon it'll show your threads, your replies, and profile
                settings. Use the sidebar to get around{user.role === "ADMIN" ? " — admin tools are under Admin." : "."}
            </p>
        </div>
    );
}

const kicker: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--terra, #c2603a)",
};
const h1: React.CSSProperties = {
    fontFamily: 'var(--display, "Fraunces", serif)',
    fontSize: 32,
    color: "var(--ink, #1c2317)",
    margin: "8px 0 0",
};
const pill: React.CSSProperties = {
    display: "inline-block",
    background: "rgba(91,107,63,0.15)",
    color: "#41502a",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 13,
    fontWeight: 600,
};