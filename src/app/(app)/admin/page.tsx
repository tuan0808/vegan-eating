// src/app/(app)/admin/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { assessAccount } from "@/lib/bot-heuristics";
import { type Member } from "./MemberRow";
import MembersView, { type TabKey, type Counts } from "./MembersView";
import "./admin-members.css";


export const metadata: Metadata = { title: "Members & roles — admin" };
export const dynamic = "force-dynamic"; // always show live roles

const TAB_KEYS: TabKey[] = ["all", "members", "unverified", "flagged", "banned"];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const me = await requireRole(["ADMIN"]); // redirects non-admins to /dashboard
    const { tab: rawTab } = await searchParams;
    const tab: TabKey = TAB_KEYS.includes(rawTab as TabKey) ? (rawTab as TabKey) : "all";
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, username: true, email: true, role: true, banned: true, emailVerified: true, createdAt: true, lastLoginAt: true, lastLoginIp: true, signupIp: true },
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
            verified: u.emailVerified != null,
            likelyBot: bot.likelyBot,
            botSignals: bot.signals,
        };
    });

    const counts: Counts = {
        all: members.length,
        members: members.filter((m) => !m.banned).length,
        unverified: members.filter((m) => !m.verified && !m.banned).length,
        flagged: members.filter((m) => m.likelyBot && !m.banned).length,
        banned: members.filter((m) => m.banned).length,
    };
    const shown =
        tab === "members" ? members.filter((m) => !m.banned)
        : tab === "unverified" ? members.filter((m) => !m.verified && !m.banned)
        : tab === "flagged" ? members.filter((m) => m.likelyBot && !m.banned)
        : tab === "banned" ? members.filter((m) => m.banned)
        : members;
    // Every tab supports bulk selection now; each bulk action has a count-aware
    // confirm dialog as the guard against accidental mass changes.
    const selectable = true;

    return (
        <div className="am-wrap" style={{ maxWidth: "none", paddingRight: 40 }}>
            <p style={kicker}>Admin</p>
            <h1 style={h1}>Members &amp; roles</h1>
            <p style={{ color: "var(--muted, #6b7264)", marginTop: 8 }}>
                Tick accounts (or Select all) to <strong>Ban</strong> in bulk — no per-row expand-and-save. On the
                bot tabs, <strong>Block + IP</strong> also blocklists their signup IP; the <strong>Banned</strong> tab has
                bulk <strong>Unban</strong>. Use Edit for single-account changes (name, username, email, role). Accounts
                still unverified after 7 days are auto-pruned.
            </p>

            <MembersView members={shown} meId={me.id} tab={tab} counts={counts} selectable={selectable} />

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
