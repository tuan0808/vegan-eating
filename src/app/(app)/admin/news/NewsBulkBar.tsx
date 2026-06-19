// src/app/(app)/admin/news/NewsBulkBar.tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSelection } from "@/components/admin/selection/SelectionProvider";
import BulkBar from "@/components/admin/selection/BulkBar";
import { deleteNewsMany, setNewsHiddenMany } from "./actions";

const ghost = (disabled: boolean): React.CSSProperties => ({
    background: "transparent",
    color: "var(--ink,#1c2317)",
    border: "1px solid var(--line,#d9d5c8)",
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
});

const del = (disabled: boolean): React.CSSProperties => ({
    background: "#b23b2e",
    color: "#fff",
    border: "none",
    padding: "9px 16px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 14,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
});

export default function NewsBulkBar() {
    const { selected, clear, count } = useSelection();
    const [pending, start] = useTransition();
    const router = useRouter();
    const disabled = pending || count === 0;

    const runHide = (hidden: boolean) =>
        start(async () => {
            if (!count) return;
            await setNewsHiddenMany(Array.from(selected), hidden);
            clear();
            router.refresh();
        });

    const runDelete = () =>
        start(async () => {
            if (!count) return;
            if (!confirm(`Delete ${count} stor${count === 1 ? "y" : "ies"}? This can't be undone.`)) return;
            await deleteNewsMany(Array.from(selected));
            clear();
            router.refresh();
        });

    return (
        <BulkBar>
            <button type="button" onClick={() => runHide(true)} disabled={disabled} style={ghost(disabled)}>
                Hide
            </button>
            <button type="button" onClick={() => runHide(false)} disabled={disabled} style={ghost(disabled)}>
                Unhide
            </button>
            <button type="button" onClick={runDelete} disabled={disabled} style={del(disabled)}>
                {pending ? "Working…" : `Delete (${count})`}
            </button>
        </BulkBar>
    );
}