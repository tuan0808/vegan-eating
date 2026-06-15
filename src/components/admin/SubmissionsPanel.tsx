// src/components/admin/SubmissionsPanel.tsx
import Link from "next/link";
import { countPendingSubmissions, pendingSubmissions } from "@/lib/submissions";

// Drop into your admin dashboard home:
//   import SubmissionsPanel from "@/components/admin/SubmissionsPanel";
//   <SubmissionsPanel />
export default async function SubmissionsPanel() {
    const [count, latest] = await Promise.all([
        countPendingSubmissions(),
        pendingSubmissions(5),
    ]);

    const olive = "var(--olive, #5b6b3f)";

    // Compact, left-aligned CTA: solid when there's work, calm outline at zero.
    const ctaBase: React.CSSProperties = {
        justifySelf: "start",
        display: "inline-flex",
        alignItems: "center",
        padding: "9px 18px",
        borderRadius: 999,
        fontWeight: 700,
        fontSize: 14,
        textDecoration: "none",
    };
    const cta: React.CSSProperties =
        count > 0
            ? { ...ctaBase, background: "var(--terra)", color: "#FCFBF4" }
            : { ...ctaBase, background: "#FCFBF4", color: "var(--ink)", border: "1px solid var(--line)" };

    return (
        <section
            style={{
                border: "1px solid var(--line)",
                borderRadius: 16,
                background: "#FCFBF4",
                boxShadow: "0 1px 3px rgba(28,35,23,0.06), 0 10px 28px rgba(28,35,23,0.04)",
                padding: 20,
                display: "grid",
                gap: 14,
            }}
        >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                <div>
                    <span className="kicker" style={{ color: olive }}>Needs review</span>
                    <h3 style={{ margin: "4px 0 0", fontFamily: "var(--display)" }}>
                        Recipe submissions
                    </h3>
                </div>
                <span
                    aria-label={`${count} pending`}
                    style={{
                        minWidth: 34,
                        height: 34,
                        padding: "0 10px",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "#fff",
                        background: count > 0 ? "var(--terra)" : olive,
                    }}
                >
          {count}
        </span>
            </div>

            {count === 0 ? (
                <p style={{ color: "var(--muted)", margin: 0 }}>
                    All clear — no submissions waiting.
                </p>
            ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
                    {latest.map((s) => (
                        <li
                            key={s.id}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                paddingBottom: 8,
                                borderBottom: "1px solid var(--line)",
                            }}
                        >
              <span
                  style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                      color: s.dietType === "VEGAN" ? olive : "#8a6d3b",
                  }}
              >
                {s.dietType === "VEGAN" ? "VG" : "VT"}
              </span>
                            <span style={{ flex: 1, fontWeight: 600, color: "var(--ink)" }}>{s.title}</span>
                            <span style={{ color: "var(--muted)", fontSize: 13 }}>
                {s.authorName ?? "member"}
              </span>
                        </li>
                    ))}
                </ul>
            )}

            <Link href="/admin/submissions" style={cta}>
                {count > 0 ? `Review ${count} submission${count === 1 ? "" : "s"}` : "Open review queue"}
            </Link>
        </section>
    );
}