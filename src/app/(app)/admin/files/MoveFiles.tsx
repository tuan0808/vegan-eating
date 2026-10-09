"use client";

// Bulk "Move to folder" for the Downloads list. The rows are server-rendered; their
// checkboxes (name "file" or "folder") join this form via the `form` attribute, so
// no row state lives here. The move route enforces ownership and blocks cycles.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { button } from "./styles";

export const MOVE_FORM_ID = "staff-move";

function boxes(): HTMLInputElement[] {
    return Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=checkbox][form="${MOVE_FORM_ID}"]:is([name=file], [name=folder])`));
}

/** Count of ticked row checkboxes, kept in sync with the DOM. */
function useSelectedCount(): number {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const update = () => setCount(boxes().filter((b) => b.checked).length);
        update();
        document.addEventListener("change", update);
        return () => document.removeEventListener("change", update);
    }, []);
    return count;
}

/** Header checkbox that ticks/unticks every movable row on the page. */
export function SelectAllFiles() {
    const selected = useSelectedCount();
    const [total, setTotal] = useState(0);
    useEffect(() => setTotal(boxes().length), []);
    if (total === 0) return null;
    return (
        <input
            type="checkbox"
            aria-label="Select all"
            checked={selected > 0 && selected === total}
            onChange={(e) => {
                for (const b of boxes()) b.checked = e.target.checked;
                document.dispatchEvent(new Event("change"));
            }}
        />
    );
}

type FolderOption = { id: string; label: string; parentId: string | null };

export function MoveFilesBar({ folders, currentFolderId }: { folders: FolderOption[]; currentFolderId: string | null }) {
    const router = useRouter();
    const selected = useSelectedCount();
    const [target, setTarget] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // A folder can't go inside itself or its own subfolders: hide those targets.
    const excluded = new Set<string>();
    if (selected > 0) {
        for (const b of boxes()) if (b.checked && b.name === "folder") excluded.add(b.value);
        for (const f of folders) if (f.parentId && excluded.has(f.parentId)) excluded.add(f.id); // folders are depth-first
    }
    const destinations = [{ id: "", label: "All files (top level)" }, ...folders].filter(
        (f) => (f.id || null) !== currentFolderId && !excluded.has(f.id),
    );
    // Keep the picked destination valid when the folder list changes (e.g. navigating).
    const value = destinations.some((d) => d.id === target) ? target : (destinations[0]?.id ?? "");

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const ids = form.getAll("file").map(String);
        const folderIds = form.getAll("folder").map(String);
        if (ids.length + folderIds.length === 0) return;
        setBusy(true);
        setError(null);
        const res = await fetch("/api/staff-files/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, folderIds, folderId: value || null }),
        });
        setBusy(false);
        if (!res.ok) {
            const j = await res.json().catch(() => null);
            setError(j?.error ?? "Move failed.");
            return;
        }
        for (const b of boxes()) b.checked = false;
        document.dispatchEvent(new Event("change"));
        router.refresh();
    };

    if (selected === 0 && !error) return null;
    return (
        <form
            id={MOVE_FORM_ID}
            onSubmit={submit}
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14, fontSize: 14 }}
        >
            <span style={{ fontWeight: 600 }}>{selected} selected</span>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                Move to
                <select
                    value={value}
                    onChange={(e) => setTarget(e.target.value)}
                    disabled={busy}
                    style={{
                        padding: "7px 12px", fontSize: 14, border: "1px solid var(--line, #d9d5c8)",
                        borderRadius: 10, background: "#fff", maxWidth: 320,
                    }}
                >
                    {destinations.map((f) => <option key={f.id || "root"} value={f.id}>{f.label}</option>)}
                </select>
            </label>
            <button type="submit" disabled={busy || selected === 0} style={{ ...button, padding: "7px 16px" }}>
                {busy ? "Moving…" : "Move"}
            </button>
            {error && <span style={{ color: "#b23e26", fontSize: 13 }}>{error}</span>}
        </form>
    );
}
