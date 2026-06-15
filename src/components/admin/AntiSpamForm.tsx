// src/components/admin/AntiSpamForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveAntiSpamConfig, type SaveState } from "@/lib/actions/antispam";
import type { AntiSpamConfig } from "@/lib/antispam-config";

const initialState: SaveState = { ok: false, message: null };

function SaveButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="as-save" disabled={pending}>
            {pending ? "Saving…" : "Save limits"}
        </button>
    );
}

export default function AntiSpamForm({ config }: { config: AntiSpamConfig }) {
    const [state, formAction] = useFormState(saveAntiSpamConfig, initialState);
    const [flash, setFlash] = useState<SaveState | null>(null);

    // state.key changes on every submit (success or error) so the flash re-triggers.
    useEffect(() => {
        if (!state.key) return;
        setFlash(state);
        const t = setTimeout(() => setFlash(null), 2800);
        return () => clearTimeout(t);
    }, [state.key]);

    return (
        <form action={formAction} className="as-form">
            <p className="as-form-head">Rate limits</p>

            <div className="as-grid">
                <label>
                    <span>Comment / reply cooldown <em>(seconds)</em></span>
                    <input type="number" name="postCooldown" min={0} max={3600} defaultValue={config.postCooldownSec} />
                </label>
                <label>
                    <span>Comments / replies per hour</span>
                    <input type="number" name="postHourly" min={1} max={1000} defaultValue={config.postHourly} />
                </label>
                <label>
                    <span>New-thread cooldown <em>(seconds)</em></span>
                    <input type="number" name="threadCooldown" min={0} max={86400} defaultValue={config.threadCooldownSec} />
                </label>
                <label>
                    <span>New threads per hour</span>
                    <input type="number" name="threadHourly" min={1} max={1000} defaultValue={config.threadHourly} />
                </label>
            </div>

            <div className="as-form-foot">
                <SaveButton />
                {flash?.message ? (
                    <span className={`as-flash ${flash.ok ? "ok" : "err"}`} role="status">
            {flash.ok ? "✓ " : ""}{flash.message}
          </span>
                ) : null}
            </div>
        </form>
    );
}