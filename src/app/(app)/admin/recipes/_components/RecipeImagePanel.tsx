// src/app/(app)/admin/recipes/_components/RecipeImagePanel.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import {
    approvePendingImages,
    discardPendingImages,
    swapHero,
} from "../_actions/recipe-images";

type Quality = "low" | "medium" | "high";

type Props = {
    slug: string;
    image: string | null;
    imageBackup: string | null;
    imagePending: string | null;
    stepImagesPending: string[]; // already parsed from JSON by the server page
    stepCount: number;
};

// Matches the recipe admin convention: absolute URLs and leading-slash paths
// pass straight through; bare paths get a leading slash. AI images are stored as
// absolute Spaces URLs, so they pass through untouched.
function imgSrc(s: string | null): string {
    const v = (s || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

export default function RecipeImagePanel(props: Props) {
    const { slug } = props;
    const [quality, setQuality] = useState<Quality>("medium");
    const canUseExisting = !!props.image;
    const [referenceMode, setReferenceMode] = useState<"generate" | "existing">("generate");
    const [pending, startTransition] = useTransition(); // approve/discard/swap
    const [msg, setMsg] = useState("");

    // generation state (streamed)
    const abortRef = useRef<AbortController | null>(null);
    const [gen, setGen] = useState(false);
    const [phase, setPhase] = useState("");
    const [done, setDone] = useState(0);
    const [total, setTotal] = useState(props.stepCount + 1);

    const [image, setImage] = useState(props.image);
    const [imageBackup, setImageBackup] = useState(props.imageBackup);
    const [heroPending, setHeroPending] = useState(props.imagePending);
    const [stepsPending, setStepsPending] = useState<string[]>(props.stepImagesPending);

    const genCount = referenceMode === "existing" ? props.stepCount : props.stepCount + 1;
    const roughCost = (genCount * 0.08).toFixed(2);
    const hasPending = !!heroPending || stepsPending.length > 0;
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const busy = gen || pending;

    function run(fn: () => Promise<any>) {
        setMsg("");
        startTransition(async () => {
            try {
                const res = await fn();
                setMsg(res?.message || "Done");
            } catch (e: any) {
                setMsg(e?.message || "Something went wrong");
            }
        });
    }

    async function generate() {
        const what =
            referenceMode === "existing"
                ? `Generate ${props.stepCount} step photo(s) matched to your current image (hero stays)`
                : `Generate ${props.stepCount + 1} images (1 hero + ${props.stepCount} steps)`;
        if (
            !confirm(`${what} at ~$${roughCost}? This calls the OpenAI API and will spend real credit.`)
        )
            return;

        setMsg("");
        setGen(true);
        setDone(0);
        setTotal(genCount);
        setPhase("Starting…");

        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const res = await fetch(`/api/admin/recipes/${slug}/generate-images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quality, force: hasPending, referenceMode }),
                signal: ac.signal,
            });

            if (res.status === 409) {
                setMsg("A pending set already exists — discard it first, then regenerate.");
                return;
            }
            if (!res.ok || !res.body) {
                setMsg(`Generation failed (${res.status}).`);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            // read the NDJSON stream line by line
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const { done: streamDone, value } = await reader.read();
                if (streamDone) break;
                buffer += decoder.decode(value, { stream: true });

                let nl: number;
                while ((nl = buffer.indexOf("\n")) >= 0) {
                    const line = buffer.slice(0, nl).trim();
                    buffer = buffer.slice(nl + 1);
                    if (!line) continue;

                    let ev: any;
                    try {
                        ev = JSON.parse(line);
                    } catch {
                        continue;
                    }

                    if (ev.type === "start") {
                        setTotal(ev.total);
                        setPhase("Starting…");
                    } else if (ev.type === "progress") {
                        setDone(ev.done);
                        if (ev.label) setPhase(ev.label);
                    } else if (ev.type === "done") {
                        setHeroPending(ev.heroUrl || null);
                        setStepsPending(ev.stepUrls || []);
                        setDone(ev.imagesGenerated);
                        const failNote = ev.failed
                            ? ` · ${ev.failed} step(s) failed — regenerate to retry them`
                            : "";
                        setMsg(
                            `Generated ${ev.imagesGenerated} images (~$${ev.estimatedCostUsd})${failNote}. Review below, then approve.`
                        );
                    } else if (ev.type === "cancelled") {
                        setMsg("Cancelled.");
                    } else if (ev.type === "error") {
                        setMsg(ev.message || "Generation failed");
                    }
                }
            }
        } catch (e: any) {
            if (e?.name === "AbortError") setMsg("Cancelled.");
            else setMsg(e?.message || "Generation failed");
        } finally {
            abortRef.current = null;
            setGen(false);
            setPhase("");
        }
    }

    return (
        <div className="panel">
            <h3>AI images · gpt-image-2</h3>

            {/* Live hero + backup + swap */}
            <div className="row">
                <div className="slot">
                    <span className="lbl">Live hero</span>
                    {image ? <img src={imgSrc(image)} alt="" /> : <div className="empty">none</div>}
                </div>
                <div className="slot">
                    <span className="lbl">Backup</span>
                    {imageBackup ? <img src={imgSrc(imageBackup)} alt="" /> : <div className="empty">none</div>}
                </div>
                <div className="swap">
                    <button
                        type="button"
                        disabled={busy || !imageBackup}
                        onClick={() =>
                            run(async () => {
                                const r = await swapHero(slug);
                                if (r.ok) {
                                    const t = image;
                                    setImage(imageBackup);
                                    setImageBackup(t);
                                }
                                return r;
                            })
                        }
                    >
                        ⇄ Swap hero / backup
                    </button>
                </div>
            </div>

            {/* Generate */}
            <div className="gen">
                <label className="ql">
                    Reference{" "}
                    <select
                        value={referenceMode}
                        onChange={(e) => setReferenceMode(e.target.value as "generate" | "existing")}
                        disabled={busy}
                        title={canUseExisting ? "" : "This recipe has no current image to match"}
                    >
                        <option value="generate">Fresh hero</option>
                        <option value="existing" disabled={!canUseExisting}>
                            Match current photo
                        </option>
                    </select>
                </label>
                <label className="ql">
                    Quality{" "}
                    <select
                        value={quality}
                        onChange={(e) => setQuality(e.target.value as Quality)}
                        disabled={busy}
                    >
                        <option value="low">low (cheap)</option>
                        <option value="medium">medium</option>
                        <option value="high">high (best)</option>
                    </select>
                </label>

                <button type="button" className="primary" disabled={busy} onClick={generate}>
                    {gen ? "Generating…" : "Generate AI images"}
                </button>
                {gen && (
                    <button type="button" className="cancel" onClick={() => abortRef.current?.abort()}>
                        Cancel
                    </button>
                )}
            </div>

            {/* Progress */}
            {gen && (
                <div className="prog">
                    <div className="bar">
                        <div className="fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="phase">
            {phase}
                        {total > 0 ? ` · ${done}/${total}` : ""}
          </span>
                </div>
            )}

            {/* Pending review */}
            {hasPending && (
                <div className="pending">
                    <div className="phead">
                        <strong>Pending — not live yet</strong>
                        <div className="pactions">
                            <button
                                type="button"
                                className="primary"
                                disabled={busy}
                                onClick={() =>
                                    run(async () => {
                                        const r = await approvePendingImages(slug);
                                        if (r.ok) {
                                            setImageBackup(image);
                                            if (heroPending) setImage(heroPending);
                                            setHeroPending(null);
                                            setStepsPending([]);
                                        }
                                        return r;
                                    })
                                }
                            >
                                ✓ Approve &amp; publish
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                    run(async () => {
                                        const r = await discardPendingImages(slug);
                                        if (r.ok) {
                                            setHeroPending(null);
                                            setStepsPending([]);
                                        }
                                        return r;
                                    })
                                }
                            >
                                ✕ Discard
                            </button>
                        </div>
                    </div>

                    <div className="grid">
                        {heroPending && (
                            <figure>
                                <img src={imgSrc(heroPending)} alt="" />
                                <figcaption>new hero</figcaption>
                            </figure>
                        )}
                        {stepsPending.map((u, i) =>
                            u ? (
                                <figure key={i}>
                                    <img src={imgSrc(u)} alt="" />
                                    <figcaption>step {i + 1}</figcaption>
                                </figure>
                            ) : (
                                <figure key={i}>
                                    <div className="failbox">failed</div>
                                    <figcaption>step {i + 1}</figcaption>
                                </figure>
                            )
                        )}
                    </div>
                </div>
            )}

            {msg && <p className="msg">{msg}</p>}

            <style jsx>{`
                .panel {
                    background: var(--card, #fffdf7);
                    border: 1px solid #e7e4d6;
                    border-radius: 14px;
                    padding: 18px;
                }
                h3 {
                    font-family: "Fraunces", serif;
                    color: var(--olive, #225f27);
                    margin: 0 0 14px;
                }
                .row {
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    margin-bottom: 18px;
                }
                .slot {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .lbl {
                    font-size: 12px;
                    color: #6b7066;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .slot img {
                    width: 180px;
                    height: 120px;
                    object-fit: cover;
                    border-radius: 10px;
                    border: 1px solid #e7e4d6;
                }
                .empty {
                    width: 180px;
                    height: 120px;
                    display: grid;
                    place-items: center;
                    color: #9aa094;
                    background: var(--paper, #f4f3ea);
                    border-radius: 10px;
                }
                .swap {
                    margin-left: auto;
                    align-self: center;
                }
                .gen {
                    display: flex;
                    gap: 14px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .ql {
                    font-size: 14px;
                    color: var(--ink, #1c2317);
                }
                select {
                    padding: 6px 8px;
                    border-radius: 8px;
                    border: 1px solid #d8d4c4;
                }
                button {
                    border: 1px solid #d8d4c4;
                    background: #fff;
                    color: var(--ink, #1c2317);
                    padding: 8px 14px;
                    border-radius: 9px;
                    cursor: pointer;
                    font-weight: 600;
                }
                button:disabled {
                    opacity: 0.55;
                    cursor: default;
                }
                button.primary {
                    background: var(--terra, #2f7d38);
                    border-color: var(--terra, #2f7d38);
                    color: #fff;
                }
                button.cancel {
                    background: #fff;
                    border-color: var(--carrot, #e15a22);
                    color: var(--carrot, #e15a22);
                }
                .prog {
                    margin-top: 14px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .bar {
                    height: 10px;
                    border-radius: 999px;
                    background: var(--paper, #f4f3ea);
                    border: 1px solid #e7e4d6;
                    overflow: hidden;
                }
                .fill {
                    height: 100%;
                    background: var(--terra, #2f7d38);
                    transition: width 0.4s ease;
                }
                .phase {
                    font-size: 13px;
                    color: #6b7066;
                }
                .pending {
                    margin-top: 18px;
                    border-top: 1px dashed #d8d4c4;
                    padding-top: 16px;
                }
                .phead {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }
                .pactions {
                    display: flex;
                    gap: 8px;
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                    gap: 12px;
                }
                figure {
                    margin: 0;
                }
                figure img {
                    width: 100%;
                    height: 110px;
                    object-fit: cover;
                    border-radius: 10px;
                    border: 1px solid #e7e4d6;
                }
                .failbox {
                    width: 100%;
                    height: 110px;
                    display: grid;
                    place-items: center;
                    border-radius: 10px;
                    border: 1px dashed var(--carrot, #e15a22);
                    background: var(--paper, #f4f3ea);
                    color: var(--carrot, #e15a22);
                    font-size: 13px;
                    font-weight: 600;
                }
                figcaption {
                    font-size: 12px;
                    color: #6b7066;
                    margin-top: 4px;
                    text-align: center;
                }
                .msg {
                    margin-top: 12px;
                    color: var(--olive, #225f27);
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}