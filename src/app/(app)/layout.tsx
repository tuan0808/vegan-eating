// src/app/(app)/layout.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import AppSidebar from "@/components/AppSidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await currentUser();
    if (!user) redirect("/login"); // middleware also guards; this is belt-and-suspenders

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--paper, #f3f1e9)",
            }}
        >
            {/* top bar — plain div, not <header> */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 24px",
                    borderBottom: "1px solid var(--line, #e6e3da)",
                    background: "#faf8f1",
                }}
            >
                <Link
                    href="/"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                >
                    <span aria-hidden style={{ fontSize: 20 }}>🥕</span>
                    <span
                        style={{
                            fontFamily: 'var(--display,"Fraunces",serif)',
                            fontSize: 19,
                            fontWeight: 600,
                            color: "var(--ink,#1c2317)",
                        }}
                    >
            vegan eating
          </span>
                </Link>

                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                    <Link
                        href="/"
                        style={{ fontSize: 13.5, color: "var(--muted,#6b7264)", textDecoration: "none" }}
                    >
                        ← Back to site
                    </Link>
                    <span style={{ fontSize: 13.5, color: "var(--ink,#1c2317)" }}>
            {user.name ?? user.username}
          </span>
                    <form
                        action={async () => {
                            "use server";
                            await signOut({ redirectTo: "/" });
                        }}
                    >
                        <button
                            type="submit"
                            style={{
                                border: "1px solid var(--line,#d9d5c8)",
                                background: "transparent",
                                color: "var(--muted,#6b7264)",
                                borderRadius: 999,
                                padding: "6px 14px",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Sign out
                        </button>
                    </form>
                </div>
            </div>

            {/* body: sidebar + content */}
            <div style={{ flex: 1, display: "flex" }}>
                <AppSidebar isAdmin={user.role === "ADMIN"} />
                <div style={{ flex: 1, minWidth: 0, padding: "40px 40px 80px" }}>{children}</div>
            </div>
        </div>
    );
}