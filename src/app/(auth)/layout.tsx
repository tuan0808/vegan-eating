// src/app/(auth)/layout.tsx
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--paper, #f3f1e9)",
            }}
        >
            {/* plain div, NOT <header> — the global header rule would pin it to the top */}
            <div style={{ padding: "22px 28px" }}>
                <Link
                    href="/"
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                >
                    <span aria-hidden style={{ fontSize: 22 }}>🥕</span>
                    <span
                        style={{
                            fontFamily: 'var(--display,"Fraunces",serif)',
                            fontSize: 22,
                            fontWeight: 600,
                            color: "var(--ink,#1c2317)",
                        }}
                    >
            vegan eating
          </span>
                </Link>
            </div>

            <div
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 20px 60px",
                }}
            >
                {children}
            </div>
        </div>
    );
}