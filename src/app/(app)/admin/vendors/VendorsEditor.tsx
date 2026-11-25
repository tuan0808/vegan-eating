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

    // Only one MAIN slot — ticking it on a row clears it everywhere else.
    const setMain = (id: string, on: boolean) =>
        setRows((rs) => rs.map((r) => ({ ...r, featured: on ? r.id === id : r.id === id ? false : r.featured })));

    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [uploadErr, setUploadErr] = useState<string | null>(null);

    const uploadImage = async (id: string, file: File) => {
        setUploadErr(null);
        setUploadingId(id);
        try {
            const fd = new FormData();
            fd.set("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = (await res.json().catch(() => null)) as { path?: string; error?: string } | null;
            if (!res.ok || !data?.path) throw new Error(data?.error || "Upload failed.");
            patch(id, "image", data.path);
        } catch (e) {
            setUploadErr((e as Error).message);
        } finally {
            setUploadingId(null);
        }
    };

    const save = () => {
        const config = { vendors: rows, dealsHref };
        const fd = new FormData();
        fd.set("config", JSON.stringify(config));
        start(async () => {
            const s = await saveVendorsAction(fd);
            setState(s);
            // Adopt the server's canonical rows (with freshly-assigned threadSlugs)
            // so a second save doesn't create duplicate forum threads.
            if (s.ok && s.vendors) setRows(s.vendors);
        });
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
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                                <label style={checkLbl}>
                                    <input type="checkbox" checked={r.prominent} onChange={(e) => patch(r.id, "prominent", e.target.checked)} />
                                    Prominent (show in nav)
                                </label>
                                <label style={checkLbl}>
                                    <input type="checkbox" checked={!!r.featured} onChange={(e) => setMain(r.id, e.target.checked)} />
                                    Main (featured spot) <span style={premiumTag}>Premium</span>
                                </label>
                            </div>
                            <button type="button" onClick={() => remove(r.id)} style={removeBtn}>Remove</button>
                        </div>

                        {r.featured && (
                            <div style={{ borderTop: "1px dashed var(--line,#e6e3d8)", paddingTop: 12, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                                <div style={featThumb}>
                                    {r.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={r.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <span style={{ fontSize: 11, color: "#fff", opacity: 0.9 }}>No image</span>
                                    )}
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180 }}>
                                    <span style={lbl}>Featured card image</span>
                                    <span style={{ fontSize: 12, color: "var(--muted,#6f7468)", lineHeight: 1.4 }}>
                                        Shown in the big card on the right of the Free Promos menu. Links to the vendor’s site. JPG/PNG/WebP, up to 8&nbsp;MB.
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                                        <label style={{ ...removeBtn, borderColor: "var(--olive,#5c6e3f)", color: "var(--olive,#5c6e3f)", cursor: "pointer" }}>
                                            {uploadingId === r.id ? "Uploading…" : r.image ? "Replace image" : "Upload image"}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                disabled={uploadingId === r.id}
                                                onChange={(e) => {
                                                    const f = e.target.files?.[0];
                                                    if (f) uploadImage(r.id, f);
                                                    e.target.value = "";
                                                }}
                                            />
                                        </label>
                                        {r.image && (
                                            <button type="button" onClick={() => patch(r.id, "image", "")} style={{ ...removeBtn, padding: "6px 10px" }}>Clear</button>
                                        )}
                                    </div>
                                    {uploadErr && uploadingId === null && <span style={{ fontSize: 12.5, color: "#9a3f1f" }}>{uploadErr}</span>}
                                </div>
                            </div>
                        )}
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
const checkLbl: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" };
const premiumTag: React.CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--carrot,#E15A22)", border: "1px solid rgba(225,90,34,.4)", borderRadius: 6, padding: "1px 6px" };
const featThumb: React.CSSProperties = { width: 128, height: 80, borderRadius: 10, overflow: "hidden", flex: "none", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#225F27,#2f9e63 60%,#8fd19e)" };
const addBtn: React.CSSProperties = { marginTop: 14, background: "transparent", border: "1px dashed var(--olive,#5c6e3f)", color: "var(--olive,#5c6e3f)", borderRadius: 11, padding: "11px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%" };
const saveBtn: React.CSSProperties = { background: "var(--carrot,#E15A22)", color: "#fff", border: 0, borderRadius: 11, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
