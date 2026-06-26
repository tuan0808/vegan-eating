"use client";
// src/components/admin/MergeTagBar.tsx
// In-editor reference for the merge tags the sender substitutes. Click to insert.
import type { RefObject } from "react";

const MERGE_TAGS = [
    { tag: "{{name}}", desc: "Member's first name — falls back to “there”" },
    { tag: "{{email}}", desc: "Recipient's email address" },
    { tag: "{{unsubscribe_url}}", desc: "Recipient's one-click unsubscribe link" },
];

export default function MergeTagBar({
    taRef,
    value,
    onChange,
}: {
    taRef: RefObject<HTMLTextAreaElement | null>;
    value: string;
    onChange: (v: string) => void;
}) {
    const insert = (snippet: string) => {
        const ta = taRef.current;
        if (!ta) {
            onChange(value + snippet);
            return;
        }
        const start = ta.selectionStart ?? value.length;
        const end = ta.selectionEnd ?? value.length;
        onChange(value.slice(0, start) + snippet + value.slice(end));
        requestAnimationFrame(() => {
            ta.focus();
            const pos = start + snippet.length;
            ta.setSelectionRange(pos, pos);
        });
    };

    return (
        <div className="ns-tags">
            <span className="ns-images-label">Merge tags</span>
            {MERGE_TAGS.map((t) => (
                <button type="button" key={t.tag} className="ns-tag-btn" title={t.desc} onClick={() => insert(t.tag)}>
                    <code>{t.tag}</code>
                    <span>{t.desc}</span>
                </button>
            ))}
        </div>
    );
}
