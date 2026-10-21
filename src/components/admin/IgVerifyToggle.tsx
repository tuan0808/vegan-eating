// src/components/admin/IgVerifyToggle.tsx — tick once you've seen they follow us on IG.
"use client";

import { useState, useTransition } from "react";
import { setIgVerifiedAction } from "@/lib/actions/local-admin";

export default function IgVerifyToggle({ userId, verified }: { userId: string; verified: boolean }) {
    const [on, setOn] = useState(verified);
    const [pending, start] = useTransition();
    return (
        <input
            type="checkbox"
            checked={on}
            disabled={pending}
            aria-label="Follows us on Instagram"
            onChange={(e) => {
                const next = e.target.checked;
                setOn(next);
                start(async () => { const r = await setIgVerifiedAction(userId, next); if (!r.ok) setOn(!next); });
            }}
        />
    );
}
