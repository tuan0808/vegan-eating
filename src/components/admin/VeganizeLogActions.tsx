// src/components/admin/VeganizeLogActions.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveVeganizedRecipe } from "@/lib/actions/veganize";

export default function VeganizeLogActions({
                                               requestId,
                                               submissionId,
                                           }: {
    requestId: string;
    submissionId: string | null;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    if (submissionId) {
        return (
            <Link href={`/submissions/${submissionId}`} className="btn-ghost">
                Review →
            </Link>
        );
    }

    return (
        <>
            {error && <span style={{ color: "#9a3f1f", fontSize: 12.5, fontWeight: 600 }}>{error}</span>}
            <button
                type="button"
                className="btn-ghost"
                disabled={pending}
                onClick={() =>
                    startTransition(async () => {
                        setError(null);
                        const res = await saveVeganizedRecipe(requestId);
                        if (!res.ok) {
                            setError(res.error ?? "Couldn't save.");
                            return;
                        }
                        router.refresh();
                    })
                }
            >
                {pending ? "Saving…" : "Save to queue"}
            </button>
        </>
    );
}