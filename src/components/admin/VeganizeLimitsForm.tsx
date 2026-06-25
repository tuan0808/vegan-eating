// src/components/admin/VeganizeLimitsForm.tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateVeganizeSettings, type SaveState } from "@/lib/actions/veganize-admin";

type Caps = Record<string, number>;

const initialState: SaveState = { ok: false, message: null };

const FIELDS: { key: string; label: string; hint?: string }[] = [
    { key: "veganize.dailyCap", label: "Daily generations per member", hint: "How many recipes each member can make per day." },
    { key: "veganize.cooldownSec", label: "Cooldown between generations (seconds)" },
    { key: "veganize.globalDailyCap", label: "Site-wide daily limit", hint: "Safety cap across all members combined." },
    { key: "veganize.minAccountAgeHours", label: "Minimum account age (hours)", hint: "How old an account must be before it can use the tool." },
    { key: "veganize.maxInputChars", label: "Max input length (characters)" },
];

function SaveRow({ flash }: { flash: SaveState | null }) {
    const { pending } = useFormStatus();
    return (
        <div className="as-form-foot">
            <button type="submit" className="as-save" disabled={pending}>
                {pending ? "Saving…" : "Save limits"}
            </button>
            {flash?.message ? (
                <span className={`as-flash ${flash.ok ? "ok" : "err"}`} role="status">
                    {flash.ok ? "✓ " : ""}
                    {flash.message}
                </span>
            ) : null}
        </div>
    );
}

export default function VeganizeLimitsForm({ caps }: { caps: Caps }) {
    const [state, formAction] = useActionState(updateVeganizeSettings, initialState);
    const [flash, setFlash] = useState<SaveState | null>(null);

    // state.key changes on every submit so the flash re-triggers, even though the
    // server component re-renders after the action's revalidation.
    useEffect(() => {
        if (!state.key) return;
        setFlash(state);
        const t = setTimeout(() => setFlash(null), 2800);
        return () => clearTimeout(t);
    }, [state.key]);

    return (
        <form action={formAction} style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {FIELDS.map((f) => (
                <label key={f.key} style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                    <span style={{ flex: 1, minWidth: 220 }}>
                        <span style={{ display: "block", fontWeight: 600, color: "var(--ink, #1c2317)" }}>{f.label}</span>
                        {f.hint && (
                            <span style={{ display: "block", fontSize: 13, color: "var(--muted, #6f7468)", marginTop: 2 }}>
                                {f.hint}
                            </span>
                        )}
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

            <SaveRow flash={flash} />
        </form>
    );
}