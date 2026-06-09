// src/app/admin/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { setUserRole } from "./actions";

export const metadata: Metadata = { title: "Admin — vegan eating" };
export const dynamic = "force-dynamic"; // always show live roles

const ROLES = ["MEMBER", "MODERATOR", "ADMIN"];

function roleColor(role: string): string {
    if (role === "ADMIN") return "#c2603a";
    if (role === "MODERATOR") return "#c79a3c";
    return "#5b6b3f";
}

export default async function AdminPage({
                                            searchParams,
                                        }: {
    searchParams: { ok?: string; error?: string };
}) {
    const me = await requireRole(["ADMIN"]); // redirects non-admins to /dashboard
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
    });

    const banner =
        searchParams?.ok === "1"
            ? { text: "Role updated.", good: true }
            : searchParams?.error === "self"
                ? { text: "You can't change your own role.", good: false }
                : searchParams?.error === "role"
                    ? { text: "That isn't a valid role.", good: false }
                    : null;

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>
            <p style={kicker}>Admin</p>
            <h1 style={h1}>Members &amp; roles</h1>
            <p style={{ color: "var(--muted, #6b7264)", marginTop: 8 }}>
                Promote trusted members to Moderator or Admin. Changes take effect on their next request.
            </p>

            {banner ? (
                <p
                    style={{
                        marginTop: 18,
                        padding: "10px 14px",
                        borderRadius: 10,
                        fontSize: 14,
                        background: banner.good ? "rgba(91,107,63,0.12)" : "rgba(194,96,58,0.10)",
                        border: `1px solid ${banner.good ? "rgba(91,107,63,0.35)" : "rgba(194,96,58,0.35)"}`,
                        color: banner.good ? "#41502a" : "#9a3f1f",
                    }}
                >
                    {banner.text}
                </p>
            ) : null}

            <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
                {users.map((u) => {
                    const display = u.name ?? u.username;
                    const isMe = u.id === me.id;
                    return (
                        <div key={u.id} style={row}>
              <span style={{ ...avatar, background: roleColor(u.role) }}>
                {display.charAt(0).toUpperCase()}
              </span>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: "var(--ink, #1c2317)" }}>
                                    {display} {isMe ? <span style={{ color: "var(--muted,#6b7264)", fontWeight: 400 }}>(you)</span> : null}
                                    <span style={{ color: "var(--muted,#6b7264)", fontWeight: 400 }}> · @{u.username}</span>
                                </div>
                                <div style={{ fontSize: 13, color: "var(--muted, #6b7264)" }}>
                                    {u.email} · joined {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </div>
                            </div>

                            <span style={{ ...pill, color: roleColor(u.role), borderColor: roleColor(u.role) }}>
                {u.role}
              </span>

                            {isMe ? (
                                <span style={{ width: 180, textAlign: "right", fontSize: 13, color: "var(--muted,#6b7264)" }}>
                  can't edit yourself
                </span>
                            ) : (
                                <form action={setUserRole} style={{ display: "flex", gap: 8 }}>
                                    <input type="hidden" name="userId" value={u.id} />
                                    <select name="role" defaultValue={u.role} style={select}>
                                        {ROLES.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                    <button type="submit" style={btn}>Update</button>
                                </form>
                            )}
                        </div>
                    );
                })}
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
const row: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "14px 18px",
    background: "#faf8f1",
    border: "1px solid var(--line, #e6e3da)",
    borderRadius: 14,
};
const avatar: React.CSSProperties = {
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontFamily: 'var(--display, "Fraunces", serif)',
    fontSize: 17,
    fontWeight: 600,
};
const pill: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    border: "1px solid",
    borderRadius: 999,
    padding: "3px 10px",
};
const select: React.CSSProperties = {
    border: "1px solid var(--line, #d9d5c8)",
    borderRadius: 8,
    padding: "7px 10px",
    fontSize: 13.5,
    background: "#fff",
    color: "var(--ink, #1c2317)",
};
const btn: React.CSSProperties = {
    border: "none",
    borderRadius: 999,
    padding: "7px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    background: "var(--terra, #c2603a)",
    color: "#fff",
    cursor: "pointer",
};