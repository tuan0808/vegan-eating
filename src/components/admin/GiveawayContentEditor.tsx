// src/components/admin/GiveawayContentEditor.tsx — the copy form for one campaign page
// (`section`: the giveaway page or the official rules).
"use client";

import { useActionState } from "react";
import RichEditor from "@/components/RichEditor";
import { saveGiveawayContentAction, type SaveState } from "@/lib/actions/giveaway-content";
import type { GiveawayContent } from "@/lib/giveaway-content";

const initialState: SaveState = { ok: false, message: null };

function Field({ label, name, value, long, hint }: { label: string; name: string; value: string; long?: boolean; hint?: string }) {
    return (
        <label className="la-field" style={{ flex: "1 1 260px" }}>
            {label}
            {long ? (
                <textarea name={name} defaultValue={value} maxLength={600} rows={3} style={{ fontFamily: "inherit", fontSize: 14.5 }} />
            ) : (
                <input name={name} defaultValue={value} maxLength={600} />
            )}
            {hint && <small style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400 }}>{hint}</small>}
        </label>
    );
}

export default function GiveawayContentEditor({ section, initial }: { section: "page" | "rules"; initial: GiveawayContent }) {
    const [state, formAction, pending] = useActionState(saveGiveawayContentAction, initialState);

    return (
        <form action={formAction} className="la-box">
            <input type="hidden" name="section" value={section} />
            <div className="la-alert" style={{ margin: 0, background: "#f7f5ee", borderColor: "var(--line, #e6e3d8)", color: "var(--ink)" }}>
                <b>Shortcuts you can type anywhere:</b>{" "}
                <code>{"{start}"}</code> <code>{"{end}"}</code> <code>{"{draw}"}</code> dates ·{" "}
                <code>{"{prize}"}</code> · <code>{"{partner}"}</code> · <code>{"{ig}"}</code> our Instagram ·{" "}
                <code>{"{rules}"}</code> link to the rules · <code>*word*</code> orange italic (headlines) ·{" "}
                <code>[text]</code> yellow highlight for anything not confirmed yet.
            </div>

            {/* Keyed on the save time so a save/reset reloads the fields from the server. */}
            <div key={initial.updatedAt ?? "default"} style={{ display: "contents" }}>
                {section === "page" ? (
                    <>
                        <div className="la-row">
                            <Field label="Partner" name="partner" value={initial.partner} hint="Shown as “Partner × vegan eating”." />
                            <Field label="Prize" name="prize" value={initial.prize} hint="Used wherever {prize} appears." />
                        </div>
                        <div className="la-row">
                            <Field label="Headline" name="headline" value={initial.headline} />
                            <Field label="Intro" name="dek" value={initial.dek} long />
                        </div>
                        {initial.steps.map((s, i) => (
                            <div key={i} className="la-row">
                                <Field label={`Step ${i + 1}`} name={`step${i}Title`} value={s.title} />
                                <Field label={`Step ${i + 1} detail`} name={`step${i}Text`} value={s.text} />
                            </div>
                        ))}
                        <div className="la-row">
                            <Field label="Sign-up form heading" name="formHeading" value={initial.formHeading} />
                            <Field label="Sign-up form subheading" name="formSubheading" value={initial.formSubheading} long />
                        </div>
                        <div className="la-row">
                            <Field label="Small print" name="footer" value={initial.footer} long hint="Keep {rules} so people can reach the official rules." />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="la-row">
                            <Field label="Headline" name="rulesHeadline" value={initial.rulesHeadline} />
                            <Field label="Bold opening line" name="rulesLead" value={initial.rulesLead} long />
                        </div>
                        <div className="la-field">
                            Rules text
                            <div style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "var(--ink)" }}>
                                <RichEditor name="rulesHtml" defaultValue={initial.rulesHtml} placeholder="Official rules…" />
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="la-row" style={{ alignItems: "center" }}>
                <button type="submit" name="intent" value="save" className="la-btn" disabled={pending}>{pending ? "Saving…" : "Save & publish"}</button>
                <button
                    type="submit"
                    name="intent"
                    value="reset"
                    className="la-btn is-ghost"
                    disabled={pending}
                    onClick={(e) => { if (!confirm(`Replace this page’s wording with the original? Your edits to it will be lost.`)) e.preventDefault(); }}
                >
                    Reset to original
                </button>
                {state.message && <span key={state.key} className={`la-msg ${state.ok ? "" : "is-err"}`}>{state.message}</span>}
            </div>
        </form>
    );
}
