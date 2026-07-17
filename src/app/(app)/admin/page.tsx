// src/app/(app)/admin/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import MemberRow, { type Member } from "./MemberRow";
import "./admin-members.css";


export const metadata: Metadata = { title: "Members & roles — admin" };
export const dynamic = "force-dynamic"; // always show live roles

export default async function AdminPage() {
    const me = await requireRole(["ADMIN"]); // redirects non-admins to /dashboard
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, username: true, email: true, role: true, banned: true, createdAt: true, lastLoginAt: true, lastLoginIp: true, signupIp: true },
    });

    const members: Member[] = users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        role: u.role,
        banned: u.banned,
        joined: new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        lastLogin: u.lastLoginAt
            ? new Date(u.lastLoginAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
            : null,
        lastLoginIp: u.lastLoginIp,
        signupIp: u.signupIp,
    }));

    return (
        <div className="am-wrap" style={{ maxWidth: "none", paddingRight: 40 }}>
            <p style={kicker}>Admin</p>
            <h1 style={h1}>Members &amp; roles</h1>
            <p style={{ color: "var(--muted, #6b7264)", marginTop: 8 }}>
                Promote trusted members, or use Edit to change a member&apos;s name, username, email, role,
                or ban state. Delete removes an account and all its content. Changes take effect on their next request.
            </p>

            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
                {members.map((m) => (
                    <MemberRow key={m.id} member={m} isMe={m.id === me.id} />
                ))}
            </div>

            <p style={{ marginTop: 30 }}>
                <Link href="/dashboard" style={{ color: "var(--terra, #c2603a)", fontWeight: 600 }}>
                    ← Back to dashboard
                </Link>
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