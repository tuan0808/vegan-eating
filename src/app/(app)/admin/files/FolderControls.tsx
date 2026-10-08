"use client";

// Folder actions for the staff Files pages. Server routes enforce every rule
// (STAFF: create + delete own; ADMIN: rename + delete any); these only drive them.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { button, ghostButton } from "./styles";

export async function createFolder(name: string, parentId: string | null): Promise<{ id: string; name: string }> {
    const res = await fetch("/api/staff-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error(j?.error ?? "Couldn't create the folder.");
    return j;
}

/** "New folder" button that expands into an inline name field. */
export function NewFolderButton({
    parentId,
    onCreated,
}: {
    parentId: string | null;
    onCreated?: (folder: { id: string; name: string }) => void;
}) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async () => {
        if (!name.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const folder = await createFolder(name, parentId);
            setName("");
            setOpen(false);
            if (onCreated) onCreated(folder);
            else router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't create the folder.");
        } finally {
            setBusy(false);
        }
    };

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} style={ghostButton}>
                + New folder
            </button>
        );
    }
    return (
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        submit();
                    }
                    if (e.key === "Escape") setOpen(false);
                }}
                maxLength={100}
                placeholder="Folder name"
                disabled={busy}
                style={{
                    padding: "7px 12px", fontSize: 14, border: "1px solid var(--line, #d9d5c8)",
                    borderRadius: 999, background: "#fff", minWidth: 180,
                }}
            />
            <button type="button" onClick={submit} disabled={busy || !name.trim()} style={{ ...button, padding: "7px 16px" }}>
                {busy ? "Creating…" : "Create"}
            </button>
            <button type="button" onClick={() => setOpen(false)} disabled={busy} style={ghostButton}>Cancel</button>
            {error && <span style={{ color: "#b23e26", fontSize: 13 }}>{error}</span>}
        </span>
    );
}

/** Rename (admin) / Delete (admin, or the creator) for one folder row. */
export function FolderRowActions({
    id,
    name,
    canRename,
    canDelete,
}: {
    id: string;
    name: string;
    canRename: boolean;
    canDelete: boolean;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const call = async (init: RequestInit, fallback: string) => {
        setBusy(true);
        const res = await fetch(`/api/staff-folders/${id}`, init);
        if (!res.ok) {
            const j = await res.json().catch(() => null);
            alert(j?.error ?? fallback);
            setBusy(false);
            return;
        }
        setBusy(false);
        router.refresh();
    };

    const rename = () => {
        const next = prompt("Rename folder", name);
        if (!next || next.trim() === name) return;
        call(
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: next }) },
            "Rename failed.",
        );
    };

    const remove = () => {
        if (!confirm(`Delete the folder "${name}" and everything inside it (subfolders and files)? This can't be undone.`)) return;
        call({ method: "DELETE" }, "Delete failed.");
    };

    return (
        <span style={{ display: "inline-flex", gap: 8 }}>
            {canRename && (
                <button type="button" onClick={rename} disabled={busy} style={ghostButton}>Rename</button>
            )}
            {canDelete && (
                <button type="button" onClick={remove} disabled={busy} style={ghostButton}>
                    {busy ? "Working…" : "Delete"}
                </button>
            )}
        </span>
    );
}
