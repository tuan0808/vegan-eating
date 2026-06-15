// src/app/(app)/admin/submissions/SubmissionActions.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveSubmission, rejectSubmission } from "./actions";

export default function SubmissionActions({ id }: { id: string }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function run(fn: (id: string) => Promise<{ ok: boolean; error?: string }>) {
        setError(null);
        startTransition(async () => {
            const res = await fn(id);
            if (!res.ok) {
                setError(res.error ?? "Something went wrong.");
                return;
            }
            router.refresh();
        });
    }

    return (
        <div className="sub-actions">
            {error && <span className="sub-actions-error">{error}</span>}
            <button
                type="button"
                className="btn-primary sub-approve"
                disabled={pending}
                onClick={() => run(approveSubmission)}
            >
                {pending ? "Working…" : "Approve & post"}
            </button>
            <button
                type="button"
                className="btn-ghost sub-reject"
                disabled={pending}
                onClick={() => {
                    if (confirm("Reject this submission? It won't be posted.")) run(rejectSubmission);
                }}
            >
                Reject
            </button>
        </div>
    );
}