"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ghostButton } from "./styles";

export default function DeleteFileButton({ id, name }: { id: string; name: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const onClick = async () => {
        if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
        setBusy(true);
        const res = await fetch(`/api/staff-files/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const j = await res.json().catch(() => null);
            alert(j?.error ?? "Delete failed.");
            setBusy(false);
            return;
        }
        router.refresh();
    };

    return (
        <button type="button" onClick={onClick} disabled={busy} style={ghostButton}>
            {busy ? "Deleting…" : "Delete"}
        </button>
    );
}
