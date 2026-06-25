"use client";
// src/components/admin/CategoryEditor.tsx — add/edit/delete/reorder collections.
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveCategoriesAction, type SaveState } from "@/lib/actions/categories";
import { slugifyCategory, type Category } from "@/lib/categorize";

const PH_OPTIONS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const initialState: SaveState = { ok: false, message: null };

// Internal row: keywords stay as raw text while editing (so you can type commas
// and spaces freely) and are parsed to string[] only when serialising to save.
type Row = Omit<Category, "keywords"> & { keywords: string };

function newRow(order: number): Row {
    return { slug: "", label: "", ph: "p1", keywords: "", showOnHome: false, showAsPill: true, order };
}

function SaveButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="as-save" disabled={pending}>
            {pending ? "Saving…" : "Save categories"}
        </button>
    );
}

export default function CategoryEditor({ initial }: { initial: Category[] }) {
    const [rows, setRows] = useState<Row[]>(
        initial
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((c) => ({ ...c, keywords: c.keywords.join(", ") })),
    );
    const [state, formAction] = useActionState(saveCategoriesAction, initialState);

    const patch = (i: number, p: Partial<Row>) =>
        setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
    const remove = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));
    const add = () => setRows((rs) => [...rs, newRow(rs.length)]);
    const move = (i: number, dir: -1 | 1) =>
        setRows((rs) => {
            const j = i + dir;
            if (j < 0 || j >= rs.length) return rs;
            const copy = rs.slice();
            [copy[i], copy[j]] = [copy[j], copy[i]];
            return copy;
        });

    // Serialise with order = current position so reordering sticks; keywords
    // text -> string[] here (the server action also normalises, so it's safe).
    const payload = JSON.stringify(
        rows.map((r, i) => ({
            ...r,
            order: i,
            slug: r.slug || slugifyCategory(r.label),
            keywords: r.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
        })),
    );

    return (
        <form action={formAction} className="cat-editor">
            <input type="hidden" name="config" value={payload} />

            <div className="cat-rows">
                {rows.map((r, i) => (
                    <div className="cat-row" key={i}>
                        <div className="cat-row-reorder">
                            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
                            <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">▼</button>
                        </div>

                        <div className="cat-row-fields">
                            <label className="cat-field">
                                <span>Name</span>
                                <input value={r.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="Salads & bowls" />
                            </label>
                            <label className="cat-field">
                                <span>Slug</span>
                                <input
                                    value={r.slug}
                                    onChange={(e) => patch(i, { slug: e.target.value })}
                                    placeholder={slugifyCategory(r.label) || "auto"}
                                />
                            </label>
                            <label className="cat-field cat-field-color">
                                <span>Card color</span>
                                <select value={r.ph} onChange={(e) => patch(i, { ph: e.target.value })}>
                                    {PH_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </label>
                            <label className="cat-field cat-field-kw">
                                <span>{r.dynamic === "thirtyMin" ? "Keywords (n/a — dynamic ≤30 min rule)" : "Title keywords (comma-separated)"}</span>
                                <input
                                    value={r.keywords}
                                    disabled={r.dynamic === "thirtyMin"}
                                    onChange={(e) => patch(i, { keywords: e.target.value })}
                                    placeholder="salad, bowl, slaw"
                                />
                            </label>

                            <div className="cat-row-toggles">
                                <label><input type="checkbox" checked={r.showOnHome} onChange={(e) => patch(i, { showOnHome: e.target.checked })} /> Homepage card</label>
                                <label><input type="checkbox" checked={r.showAsPill} onChange={(e) => patch(i, { showAsPill: e.target.checked })} /> Filter pill</label>
                                <button type="button" className="cat-del" onClick={() => remove(i)}>Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="cat-editor-foot">
                <button type="button" className="as-save cat-add" onClick={add}>+ Add category</button>
                <SaveButton />
                {state.message ? (
                    <span className={`as-flash ${state.ok ? "ok" : "err"}`} role="status">
                        {state.ok ? "✓ " : ""}{state.message}
                    </span>
                ) : null}
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
                Keywords drive the bulk categorize tool below. After adding a category, run Preview → Apply to tag matching recipes.
                The ≤30-minute collection is dynamic (no keywords needed).
            </p>
        </form>
    );
}
