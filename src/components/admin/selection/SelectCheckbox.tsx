// src/components/admin/selection/SelectCheckbox.tsx
"use client";

import { useSelection } from "./SelectionProvider";

// Renders nothing when not inside a SelectionProvider, so rows can include it
// unconditionally and it only appears where selection is enabled.
export default function SelectCheckbox({
                                           id,
                                           label,
                                           style,
                                       }: {
    id: string;
    label?: string;
    style?: React.CSSProperties;
}) {
    const { enabled, isSelected, toggle } = useSelection();
    if (!enabled) return null;

    return (
        <input
            type="checkbox"
            checked={isSelected(id)}
            onChange={() => toggle(id)}
            aria-label={label ?? `Select ${id}`}
            style={{
                width: 18,
                height: 18,
                accentColor: "var(--green,#5b6b3f)",
                flexShrink: 0,
                cursor: "pointer",
                ...style,
            }}
        />
    );
}