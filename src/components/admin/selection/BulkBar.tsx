// src/components/admin/selection/BulkBar.tsx
"use client";

import { useSelection } from "./SelectionProvider";

const bar: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    margin: "4px 0 14px",
    padding: "10px 14px",
    background: "#fff",
    border: "1px solid var(--line,#e5e2d6)",
    borderRadius: 10,
};

/**
 * Generic bulk-action bar: a "select all (n)" control on the left and a slot on
 * the right for list-specific action buttons (passed as children). Hides itself
 * when there's nothing to select. The action buttons read the selection via
 * useSelection() themselves.
 */
export default function BulkBar({ children }: { children?: React.ReactNode }) {
    const { enabled, allIds, allSelected, selectAll, count } = useSelection();
    if (!enabled || allIds.length === 0) return null;

    return (
        <div style={bar}>
            <label
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                }}
            >
                <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={selectAll}
                    style={{ width: 18, height: 18, accentColor: "var(--green,#5b6b3f)" }}
                />
                Select all ({allIds.length})
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {count > 0 && (
                    <span style={{ fontSize: 13, color: "var(--muted,#6b7264)" }}>{count} selected</span>
                )}
                {children}
            </div>
        </div>
    );
}