// src/app/(app)/layout.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import AppSidebar from "@/components/AppSidebar";
import { MobileNavProvider, MobileNavToggle } from "@/components/MobileNav";

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
            {/* MobileNavProvider wraps both the hamburger (in the top bar) and the
                drawer (AppSidebar) so they share open/close state. It renders no DOM
                of its own, so it can't create a containing block that would break the
                drawer's position:fixed. */}
            <MobileNavProvider>
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
                    {/* left group: hamburger (mobile only) + wordmark */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <MobileNavToggle />
                        {/* This bar is a light surface, so it uses the ink wordmark variant
                            (/logo/logo-ink.svg) — the standard /logo/logo.svg is white-on-dark
                            and would vanish here. */}
                        <Link
                            href="/"
                            aria-label="vegan eating home"
                            style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}
                        >
                            <img
                                src="/logo/logo-ink.svg"
                                alt="vegan eating"
                                width={128}
                                height={34}
                                style={{ height: 34, width: "auto", display: "block" }}
                            />
                        </Link>
                    </div>

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

                {/* body: sidebar + content. On mobile the sidebar is a fixed drawer
                    (see app-sidebar.css), so it leaves the flow and the content fills. */}
                <div className="app-shell-body" style={{ flex: 1, display: "flex" }}>
                    <AppSidebar isAdmin={user.role === "ADMIN"} />
                    {/* padding lives in .app-shell-main so the mobile breakpoint can shrink it */}
                    <div className="app-shell-main" style={{ flex: 1, minWidth: 0 }}>{children}</div>
                </div>
            </MobileNavProvider>
        </div>
    );
}