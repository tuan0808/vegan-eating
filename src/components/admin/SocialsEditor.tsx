"use client";
// src/components/admin/SocialsEditor.tsx — add/edit/delete/reorder the social
// profile links shown on /links. Paste a URL, hit +, then Save.
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrashCan, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import SocialIcon from "@/components/SocialIcon";
import { saveSocialsAction, type SaveState } from "@/lib/actions/socials";
import { detectPlatform, normalizeSocialUrl } from "@/lib/social-platforms";

const initialState: SaveState = { ok: false, message: null };

function SaveButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="as-save" disabled={pending}>
            {pending ? "Saving…" : "Save"}
        </button>
    );
}

export default function SocialsEditor({ initial }: { initial: string[] }) {
    const [links, setLinks] = useState<string[]>(initial);
    const [draft, setDraft] = useState("");
    const [draftError, setDraftError] = useState<string | null>(null);
    const [state, formAction] = useActionState(saveSocialsAction, initialState);

    const add = () => {
        const url = normalizeSocialUrl(draft);
        if (!url) return setDraftError("That doesn't look like a valid URL.");
        if (links.includes(url)) return setDraftError("That link is already in the list.");
        setLinks((ls) => [...ls, url]);
        setDraft("");
        setDraftError(null);
    };
    const patch = (i: number, v: string) => setLinks((ls) => ls.map((l, j) => (j === i ? v : l)));
    const remove = (i: number) => setLinks((ls) => ls.filter((_, j) => j !== i));
    const move = (i: number, dir: -1 | 1) =>
        setLinks((ls) => {
            const j = i + dir;
            if (j < 0 || j >= ls.length) return ls;
            const copy = ls.slice();
            [copy[i], copy[j]] = [copy[j], copy[i]];
            return copy;
        });

    const draftPlatform = detectPlatform(normalizeSocialUrl(draft) ?? "");

    return (
        <form action={formAction} className="soc-editor">
            <input type="hidden" name="links" value={JSON.stringify(links)} />

            <div className="soc-add">
                <span className="soc-ico"><SocialIcon platform={draft ? draftPlatform.key : "website"} /></span>
                <input
                    type="text"
                    inputMode="url"
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); setDraftError(null); }}
                    // Enter adds the link instead of submitting the whole form.
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                    placeholder="Add URL to profile — e.g. https://youtube.com/@veganeating"
                    aria-label="Profile URL"
                />
                <button type="button" className="soc-plus" onClick={add} aria-label="Add link" title="Add link">
                    <FontAwesomeIcon icon={faPlus} />
                </button>
            </div>
            {draftError ? <p className="soc-err" role="alert">{draftError}</p> : null}

            {links.length ? (
                <ul className="soc-rows">
                    {links.map((l, i) => {
                        const p = detectPlatform(normalizeSocialUrl(l) ?? "");
                        return (
                            <li className="soc-row" key={i}>
                                <span className="soc-ico" title={p.label}><SocialIcon platform={p.key} /></span>
                                <span className="soc-label">{p.label}</span>
                                <input value={l} onChange={(e) => patch(i, e.target.value)} aria-label={`${p.label} URL`} />
                                <div className="soc-actions">
                                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><FontAwesomeIcon icon={faArrowUp} /></button>
                                    <button type="button" onClick={() => move(i, 1)} disabled={i === links.length - 1} aria-label="Move down"><FontAwesomeIcon icon={faArrowDown} /></button>
                                    <button type="button" className="soc-del" onClick={() => remove(i)} aria-label="Delete"><FontAwesomeIcon icon={faTrashCan} /></button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="muted soc-empty">No links yet — paste a profile URL above and hit +.</p>
            )}

            <div className="soc-foot">
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
