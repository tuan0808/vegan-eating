// src/app/(app)/admin/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { assessAccount } from "@/lib/bot-heuristics";
import MemberRow, { type Member } from "./MemberRow";
import "./admin-members.css";


export const metadata: Metadata = { title: "Members & roles — admin" };
export const dynamic = "force-dynamic"; // always show live roles

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
    const me = await requireRole(["ADMIN"]); // redirects non-admins to /dashboard
    const { filter } = await searchParams;
    const botsOnly = filter === "bots";
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, username: true, email: true, role: true, banned: true, createdAt: true, lastLoginAt: true, lastLoginIp: true, signupIp: true },
    });

    const members: Member[] = users.map((u) => {
        const bot = assessAccount({ username: u.username, email: u.email });
        return {
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
            likelyBot: bot.likelyBot,
            botSignals: bot.signals,
        };
    });

    // Flagged accounts still active (not already banned) — the triage worklist.
    const flaggedCount = members.filter((m) => m.likelyBot && !m.banned).length;
    const shown = botsOnly ? members.filter((m) => m.likelyBot) : members;

    return (
        <div className="am-wrap" style={{ maxWidth: "none", paddingRight: 40 }}>
            <p style={kicker}>Admin</p>
            <h1 style={h1}>Members &amp; roles</h1>
            <p style={{ color: "var(--muted, #6b7264)", marginTop: 8 }}>
                Promote trusted members, or use Edit to change a member&apos;s name, username, email, role,
                or ban state. Delete removes an account and all its content. Changes take effect on their next request.
            </p>

            {flaggedCount > 0 ? (
                <div style={botBanner}>
                    <span>
                        ⚠ <strong>{flaggedCount}</strong> active {flaggedCount === 1 ? "account looks" : "accounts look"} automated
                        (random username or Gmail dot-alias). Review each — the flag is a heuristic, not proof.
                    </span>
                    <Link href={botsOnly ? "/admin" : "/admin?filter=bots"} style={botBannerLink}>
                        {botsOnly ? "Show all members" : "Show flagged only"}
                    </Link>
                </div>
            ) : null}

            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
                {shown.map((m) => (
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
const botBanner: React.CSSProperties = {
    marginTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 16, flexWrap: "wrap",
    background: "#fbe6c8", border: "1px solid #e6c48a", borderRadius: 12,
    padding: "12px 16px", fontSize: 14, color: "#6f4a10",
};
const botBannerLink: React.CSSProperties = {
    color: "#8a5a12", fontWeight: 700, whiteSpace: "nowrap",
};