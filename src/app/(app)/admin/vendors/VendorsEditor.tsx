"use client";

// Editor for the vendor promo codes shown in the nav Forum dropdown. Add/remove
// vendors, set the member-only code, and tick "Prominent" to surface a vendor in
// the nav (the rest live in the Vendor Deals forum board at dealsHref). Saves via
// the permission-gated saveVendorsAction.
import { useState, useTransition } from "react";
import { saveVendorsAction, type SaveState } from "@/lib/actions/vendor-config";
import type { VendorConfig, Vendor } from "@/lib/vendor-config";

type Row = Vendor;

const newId = () =>
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}-${Math.round(Math.random() * 1e6)}`);

const blankRow = (): Row => ({ id: newId(), name: "", url: "", code: "", blurb: "", prominent: true });

export default function VendorsEditor({ initial }: { initial: VendorConfig }) {
    const [rows, setRows] = useState<Row[]>(initial.vendors.length ? initial.vendors : [blankRow()]);
    const [dealsHref, setDealsHref] = useState(initial.dealsHref || "/forum");
    const [state, setState] = useState<SaveState | null>(null);
    const [pending, start] = useTransition();

    const patch = (id: string, field: keyof Row, value: string | boolean) =>
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
    const add = () => setRows((rs) => [...rs, blankRow()]);

    const save = () => {
        const config = { vendors: rows, dealsHref };
        const fd = new FormData();
        fd.set("config", JSON.stringify(config));
        start(async () => setState(await saveVendorsAction(fd)));
    };

    const prominentCount = rows.filter((r) => r.prominent && r.name.trim()).length;

    return (
        <div style={wrap}>
            <div style={{ marginBottom: 20 }}>
                <h1 style={{ margin: 0, fontSize: 24 }}>Vendor deals</h1>
                <p style={{ margin: "6px 0 0", color: "var(--muted,#6f7468)", fontSize: 14, lineHeight: 1.5 }}>
                    Promo codes shown in the nav <b>Forum</b> menu. The code is members-only — logged-out visitors see the
                    vendor but not the code. Tick <b>Prominent</b> to feature a vendor in the nav ({prominentCount} now);
                    the rest belong in the Vendor Deals forum board.
                </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {rows.map((r) => (
                    <div key={r.id} style={card}>
                        <div style={rowGrid}>
                            <label style={field}>
                                <span style={lbl}>Vendor name</span>
                                <input style={input} value={r.name} onChange={(e) => patch(r.id, "name", e.target.value)} placeholder="e.g. Nuts.com" maxLength={200} />
                            </label>
                            <label style={field}>
                                <span style={lbl}>Promo code <span style={{ color: "var(--muted,#6f7468)", fontWeight: 400 }}>(members only)</span></span>
                                <input style={input} value={r.code} onChange={(e) => patch(r.id, "code", e.target.value)} placeholder="VEGAN20" maxLength={200} />
                            </label>
                        </div>
                        <div style={rowGrid}>
                            <label style={field}>
                                <span style={lbl}>Offer / blurb</span>
                                <input style={input} value={r.blurb ?? ""} onChange={(e) => patch(r.id, "blurb", e.target.value)} placeholder="20% off sitewide" maxLength={200} />
                            </label>
                            <label style={field}>
                                <span style={lbl}>Link <span style={{ color: "var(--muted,#6f7468)", fontWeight: 400 }}>(optional)</span></span>
                                <input style={input} value={r.url ?? ""} onChange={(e) => patch(r.id, "url", e.target.value)} placeholder="https://vendor.com" maxLength={200} />
                            </label>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                                <input type="checkbox" checked={r.prominent} onChange={(e) => patch(r.id, "prominent", e.target.checked)} />
                                Prominent (show in nav)
                            </label>
                            <button type="button" onClick={() => remove(r.id)} style={removeBtn}>Remove</button>
                        </div>
                    </div>
                ))}
            </div>

            <button type="button" onClick={add} style={addBtn}>+ Add vendor</button>

            <div style={{ ...card, marginTop: 18 }}>
                <label style={field}>
                    <span style={lbl}>“Browse all deals” link (Vendor Deals forum board)</span>
                    <input style={input} value={dealsHref} onChange={(e) => setDealsHref(e.target.value)} placeholder="/forum/general/vendor-deals" maxLength={200} />
                </label>
                <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--muted,#6f7468)" }}>
                    Paste the URL of your Vendor Deals board (e.g. <code>/forum/general/veganeating-promo-codes</code>).
                    Each new code is auto-posted there as its own thread. Defaults to <code>/forum</code> (no auto-posting).
                </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
                <button type="button" onClick={save} disabled={pending} style={{ ...saveBtn, opacity: pending ? 0.6 : 1 }}>
                    {pending ? "Saving…" : "Save changes"}
                </button>
                {state?.message && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: state.ok ? "var(--green,#1f4a2f)" : "#9a3f1f" }}>{state.message}</span>
                )}
            </div>
            {initial.updatedAt && (
                <p style={{ marginTop: 14, fontSize: 12.5, color: "var(--muted,#6f7468)" }}>
                    Last saved {new Date(initial.updatedAt).toLocaleString()}{initial.updatedBy ? ` by ${initial.updatedBy}` : ""}.
                </p>
            )}
        </div>
    );
}

const wrap: React.CSSProperties = { maxWidth: 760, padding: "28px 24px 60px" };
const card: React.CSSProperties = { background: "var(--card,#fffdf7)", border: "1px solid var(--line,#e6e3d8)", borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 };
const rowGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--ink,#1c2317)" };
const input: React.CSSProperties = { border: "1px solid #d9d5c8", borderRadius: 10, padding: "9px 11px", fontSize: 14.5, background: "#fff", color: "var(--ink,#1c2317)", fontFamily: "inherit" };
const removeBtn: React.CSSProperties = { background: "transparent", border: "1px solid rgba(154,63,31,.35)", color: "#9a3f1f", borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
const addBtn: React.CSSProperties = { marginTop: 14, background: "transparent", border: "1px dashed var(--olive,#5c6e3f)", color: "var(--olive,#5c6e3f)", borderRadius: 11, padding: "11px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%" };
const saveBtn: React.CSSProperties = { background: "var(--carrot,#E15A22)", color: "#fff", border: 0, borderRadius: 11, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
