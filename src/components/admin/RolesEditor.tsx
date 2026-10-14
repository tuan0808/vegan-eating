"use client";
// src/components/admin/RolesEditor.tsx — role × permission checkbox matrix, plus
// adding/removing custom roles. Everything is saved in one go.
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { saveRolesAction, type SaveState } from "@/lib/actions/roles";
import type { Permission, RoleDef } from "@/lib/permissions";

const initialState: SaveState = { ok: false, message: null };

function SaveButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="as-save" disabled={pending}>
            {pending ? "Saving…" : "Save"}
        </button>
    );
}

function toKey(label: string): string {
    return label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^[0-9_]+/, "").slice(0, 24);
}

export default function RolesEditor({
    roles: initialRoles,
    initialGrants,
    permissions,
    members,
}: {
    roles: RoleDef[];
    initialGrants: Record<string, Permission[]>;
    permissions: { key: Permission; label: string; hint: string }[];
    members: Record<string, number>;
}) {
    const [roles, setRoles] = useState<RoleDef[]>(initialRoles);
    const [grants, setGrants] = useState<Record<string, Permission[]>>(initialGrants);
    const [draft, setDraft] = useState("");
    const [draftError, setDraftError] = useState<string | null>(null);
    const [state, formAction] = useActionState(saveRolesAction, initialState);

    const has = (role: string, p: Permission) => role === "ADMIN" || (grants[role] ?? []).includes(p);
    const toggle = (role: string, p: Permission) =>
        setGrants((g) => {
            const cur = g[role] ?? [];
            return { ...g, [role]: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] };
        });

    const add = () => {
        const label = draft.trim();
        const key = toKey(label);
        if (key.length < 2) return setDraftError("Give the role a name, e.g. Social media.");
        if (roles.some((r) => r.key === key)) return setDraftError(`There's already a role called ${key}.`);
        // Insert before ADMIN so Admin stays the last column.
        setRoles((rs) => [...rs.filter((r) => r.key !== "ADMIN"), { key, label, builtIn: false }, ...rs.filter((r) => r.key === "ADMIN")]);
        setDraft("");
        setDraftError(null);
    };
    const remove = (key: string) => {
        setRoles((rs) => rs.filter((r) => r.key !== key));
        setGrants(({ [key]: _gone, ...rest }) => rest);
    };

    const config = {
        custom: roles.filter((r) => !r.builtIn).map((r) => ({ key: r.key, label: r.label })),
        grants,
    };

    return (
        <form action={formAction} className="roles-editor">
            <input type="hidden" name="config" value={JSON.stringify(config)} />

            <div className="roles-scroll">
                <table className="roles-table">
                    <thead>
                        <tr>
                            <th scope="col" className="roles-perm-h">Can…</th>
                            {roles.map((r) => {
                                const n = members[r.key] ?? 0;
                                return (
                                    <th scope="col" key={r.key} title={r.note}>
                                        <span className="roles-name">{r.label}</span>
                                        <span className="roles-key">{r.key}</span>
                                        <span className="roles-count">{n} member{n === 1 ? "" : "s"}</span>
                                        {!r.builtIn && (
                                            <button
                                                type="button"
                                                className="roles-del"
                                                onClick={() => remove(r.key)}
                                                disabled={n > 0}
                                                title={n > 0 ? "Move its members to another role first" : `Delete the ${r.label} role`}
                                                aria-label={`Delete the ${r.label} role`}
                                            >
                                                <FontAwesomeIcon icon={faTrashCan} />
                                            </button>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {permissions.map((p) => (
                            <tr key={p.key}>
                                <th scope="row">
                                    <span className="roles-name">{p.label}</span>
                                    <span className="roles-hint">{p.hint}</span>
                                </th>
                                {roles.map((r) => (
                                    <td key={r.key}>
                                        <input
                                            type="checkbox"
                                            checked={has(r.key, p.key)}
                                            disabled={r.key === "ADMIN"}
                                            onChange={() => toggle(r.key, p.key)}
                                            aria-label={`${r.label}: ${p.label}`}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="roles-add">
                <input
                    type="text"
                    value={draft}
                    maxLength={40}
                    onChange={(e) => { setDraft(e.target.value); setDraftError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    placeholder="New role — e.g. Social media"
                    aria-label="New role name"
                />
                <button type="button" className="roles-plus" onClick={add} aria-label="Add role" title="Add role">
                    <FontAwesomeIcon icon={faPlus} />
                </button>
                {draft.trim() ? <span className="muted roles-preview">Saved as {toKey(draft) || "…"}</span> : null}
            </div>
            {draftError ? <p className="roles-err" role="alert">{draftError}</p> : null}

            <div className="roles-foot">
                <SaveButton />
                {state.message ? (
                    <span className={`as-flash ${state.ok ? "ok" : "err"}`} role="status">
                        {state.ok ? "✓ " : ""}{state.message}
                    </span>
                ) : null}
            </div>
        </form>
    );
}
