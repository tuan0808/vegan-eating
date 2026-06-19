// src/components/admin/VeganizeLimits.tsx
import Link from "next/link";
import { getVeganizeCaps } from "@/lib/veganize-admin";
import { updateVeganizeSettings } from "@/lib/actions/veganize-admin";

const FIELDS: { key: string; label: string; hint?: string }[] = [
    { key: "veganize.dailyCap", label: "Daily generations per member", hint: "How many recipes each member can make per day." },
    { key: "veganize.cooldownSec", label: "Cooldown between generations (seconds)" },
    { key: "veganize.globalDailyCap", label: "Site-wide daily limit", hint: "Safety cap across all members combined." },
    { key: "veganize.minAccountAgeHours", label: "Minimum account age (hours)", hint: "How old an account must be before it can use the tool." },
    { key: "veganize.maxInputChars", label: "Max input length (characters)" },
];

export default async function VeganizeLimits() {
    const caps = await getVeganizeCaps();

    return (
        <section
            style={{
                background: "#fff",
                border: "1px solid var(--line, #e6e3da)",
                borderRadius: 16,
                padding: "22px 24px",
            }}
        >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                    <p className="kicker" style={{ margin: 0 }}>Veganizer</p>
                    <h2 style={{ fontFamily: "var(--display, 'Fraunces', serif)", margin: "6px 0 0", fontSize: "1.4rem" }}>
                        Limits
                    </h2>
                </div>
                <Link href="/admin/veganize" style={{ fontSize: 14, fontWeight: 600, color: "var(--terra, #2F7D38)", textDecoration: "none" }}>
                    View generation log →
                </Link>
            </div>

            <form
                action={updateVeganizeSettings}
                style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}
            >
                {FIELDS.map((f) => (
                    <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        <span style={{ flex: 1, minWidth: 220 }}>
                            <span style={{ display: "block", fontWeight: 600, color: "var(--ink, #1c2317)" }}>{f.label}</span>
                            {f.hint && <span style={{ display: "block", fontSize: 13, color: "var(--muted, #6f7468)", marginTop: 2 }}>{f.hint}</span>}
                        </span>
                        <input
                            type="number"
                            name={f.key}
                            defaultValue={caps[f.key]}
                            min={0}
                            inputMode="numeric"
                            style={{
                                width: 110,
                                border: "1px solid var(--line, #d9d5c8)",
                                borderRadius: 8,
                                padding: "8px 10px",
                                fontSize: 14,
                                background: "#fffefb",
                                color: "var(--ink, #1c2317)",
                            }}
                        />
                    </label>
                ))}

                <div style={{ paddingTop: 6 }}>
                    <button
                        type="submit"
                        style={{
                            border: "none",
                            borderRadius: 999,
                            padding: "9px 20px",
                            fontSize: 14,
                            fontWeight: 600,
                            background: "var(--terra, #2F7D38)",
                            color: "#fff",
                            cursor: "pointer",
                            fontFamily: "inherit",
                        }}
                    >
                        Save limits
                    </button>
                </div>
            </form>
        </section>
    );
}