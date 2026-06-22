// src/app/(app)/admin/articles/_components/ArticleImagePanel.tsx
"use client";

import { useRef, useState } from "react";
import {
    setArticleHero,
    discardPendingHero,
    swapArticleHero,
    clearArticleSectionImages,
} from "../_actions/article-images";

type Quality = "low" | "medium" | "high";

type Props = {
    slug: string;
    image: string | null;
    imageBackup: string | null;
    imagePending: string | null;
    sectionImages: string[]; // parsed from JSON by the server page
    subtitleCount: number;
    hasExistingImage: boolean;
};

function imgSrc(s: string | null): string {
    const v = (s || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v) || v.startsWith("/")) return v;
    return "/" + v.replace(/^\.?\//, "");
}

function fileName(url: string, i: number, kind: string): string {
    const base = url.split("?")[0].split("/").pop() || `${kind}-${i + 1}.png`;
    return base;
}

export default function ArticleImagePanel(props: Props) {
    const { slug } = props;
    const [quality, setQuality] = useState<Quality>("medium");
    const [referenceMode, setReferenceMode] = useState<"generate" | "existing">("generate");
    const [pending, setPendingState] = useState(false); // small actions (set/swap/discard/clear)
    const [msg, setMsg] = useState("");

    const [gen, setGen] = useState(false);
    const [phase, setPhase] = useState("");
    const [done, setDone] = useState(0);
    const [total, setTotal] = useState(props.subtitleCount + 1);
    const abortRef = useRef<AbortController | null>(null);

    const [image, setImage] = useState(props.image);
    const [imageBackup, setImageBackup] = useState(props.imageBackup);
    const [heroPending, setHeroPending] = useState(props.imagePending);
    const [sections, setSections] = useState<string[]>(props.sectionImages);

    const genCount = referenceMode === "existing" ? props.subtitleCount : props.subtitleCount + 1;
    const roughCost = (genCount * 0.08).toFixed(2);
    const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
    const busy = gen || pending;

    function runAction(fn: () => Promise<any>) {
        setMsg("");
        setPendingState(true);
        fn()
            .then((res) => setMsg(res?.message || "Done"))
            .catch((e) => setMsg(e?.message || "Something went wrong"))
            .finally(() => setPendingState(false));
    }

    async function generate() {
        const what =
            referenceMode === "existing"
                ? `Generate ${props.subtitleCount} section image(s) matched to your current hero`
                : `Generate ${props.subtitleCount + 1} images (1 hero + ${props.subtitleCount} sections)`;
        if (!confirm(`${what} at ~$${roughCost}? This calls the OpenAI API and will spend real credit.`)) return;

        setMsg("");
        setGen(true);
        setDone(0);
        setTotal(genCount);
        setPhase("Starting…");
        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const res = await fetch(`/api/admin/articles/${slug}/generate-images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quality, referenceMode }),
                signal: ac.signal,
            });
            if (!res.ok || !res.body) {
                setMsg(`Generation failed (${res.status}).`);
                return;
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
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
                        if (ev.heroUrl) setHeroPending(ev.heroUrl);
                        setSections(ev.sectionUrls || []);
                        const failNote = ev.failed ? ` · ${ev.failed} failed` : "";
                        setMsg(`Generated ${ev.imagesGenerated} image(s) (~$${ev.estimatedCostUsd})${failNote}.`);
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

    async function download(url: string, name: string) {
        // Works same-origin (dev). Cross-origin (Spaces) opens the image in a new tab
        // where you can save it — the download attr is ignored cross-origin.
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = name;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch {
            window.open(url, "_blank");
        }
    }

    return (
        <div className="panel">
            <h3>AI images · gpt-image-2</h3>
            <p className="lead">
                Generates a hero from the title and one image per subtitle. They save here so you can
                download them or <strong>drag them straight into the article body</strong> above, then save.
            </p>

            {/* Hero */}
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
                        onClick={() => {
                            if (!confirm("Swapping the hero reloads the page to sync the form — save any body edits first. Continue?")) return;
                            runAction(async () => {
                                const r = await swapArticleHero(slug);
                                if (r.ok) window.location.reload();
                                return r;
                            });
                        }}
                    >
                        ⇄ Swap hero / backup
                    </button>
                </div>
            </div>

            {/* Generate controls */}
            <div className="gen">
                <label className="ql">
                    Reference{" "}
                    <select
                        value={referenceMode}
                        onChange={(e) => setReferenceMode(e.target.value as "generate" | "existing")}
                        disabled={busy}
                    >
                        <option value="generate">New hero + sections</option>
                        <option value="existing" disabled={!props.hasExistingImage}>
                            Keep current hero (sections only)
                        </option>
                    </select>
                </label>
                <label className="ql">
                    Quality{" "}
                    <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)} disabled={busy}>
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

            {props.subtitleCount === 0 && (
                <p className="hint">
                    No subtitles detected in the body yet. Add headings (H2/H3) or bold section titles and save,
                    then the section images will be generated per subtitle. A hero is still generated either way.
                </p>
            )}

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

            {/* Pending hero */}
            {heroPending && (
                <div className="pendinghero">
                    <div className="ph-img">
                        <img src={imgSrc(heroPending)} alt="" draggable />
                        <span className="lbl">generated hero</span>
                    </div>
                    <div className="ph-actions">
                        <button
                            type="button"
                            className="primary"
                            disabled={busy}
                            onClick={() => {
                                if (!confirm("Setting the hero reloads the page to sync the form — save any body edits first. Continue?")) return;
                                runAction(async () => {
                                    const r = await setArticleHero(slug);
                                    if (r.ok) window.location.reload();
                                    return r;
                                });
                            }}
                        >
                            ✓ Set as hero
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                                runAction(async () => {
                                    const r = await discardPendingHero(slug);
                                    if (r.ok) setHeroPending(null);
                                    return r;
                                })
                            }
                        >
                            ✕ Discard
                        </button>
                        <button type="button" disabled={busy} onClick={() => download(imgSrc(heroPending), fileName(heroPending, 0, "hero"))}>
                            ⤓ Download
                        </button>
                    </div>
                </div>
            )}

            {/* Section gallery */}
            {sections.length > 0 && (
                <div className="gallery">
                    <div className="ghead">
                        <strong>Section images — drag into the body, or download</strong>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                                runAction(async () => {
                                    const r = await clearArticleSectionImages(slug);
                                    if (r.ok) setSections([]);
                                    return r;
                                })
                            }
                        >
                            Clear all
                        </button>
                    </div>
                    <div className="grid">
                        {sections.map((u, i) =>
                            u ? (
                                <figure key={i}>
                                    <img src={imgSrc(u)} alt="" draggable title="Drag me into the article body" />
                                    <div className="figctl">
                                        <button type="button" onClick={() => download(imgSrc(u), fileName(u, i, "section"))} title="Download">⤓</button>
                                        <button type="button" onClick={() => navigator.clipboard?.writeText(imgSrc(u))} title="Copy URL">⧉</button>
                                    </div>
                                    <figcaption>#{i + 1}</figcaption>
                                </figure>
                            ) : (
                                <figure key={i}>
                                    <div className="failbox">failed</div>
                                    <figcaption>#{i + 1}</figcaption>
                                </figure>
                            )
                        )}
                    </div>
                </div>
            )}

            {msg && <p className="msg">{msg}</p>}

            <style jsx>{`
        .panel { background: var(--card, #fffdf7); border: 1px solid #e7e4d6; border-radius: 14px; padding: 18px; }
        h3 { font-family: "Fraunces", serif; color: var(--olive, #225f27); margin: 0 0 6px; }
        .lead { font-size: 13.5px; color: #6b7066; margin: 0 0 16px; }
        .hint { font-size: 13px; color: #6b7066; margin: 10px 0 0; }
        .row { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 18px; }
        .slot { display: flex; flex-direction: column; gap: 6px; }
        .lbl { font-size: 12px; color: #6b7066; text-transform: uppercase; letter-spacing: .04em; }
        .slot img { width: 200px; height: 120px; object-fit: cover; border-radius: 10px; border: 1px solid #e7e4d6; }
        .empty { width: 200px; height: 120px; display: grid; place-items: center; color: #9aa094; background: var(--paper, #f4f3ea); border-radius: 10px; }
        .swap { margin-left: auto; align-self: center; }
        .gen { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
        .ql { font-size: 14px; color: var(--ink, #1c2317); }
        select { padding: 6px 8px; border-radius: 8px; border: 1px solid #d8d4c4; }
        button { border: 1px solid #d8d4c4; background: #fff; color: var(--ink, #1c2317); padding: 8px 14px; border-radius: 9px; cursor: pointer; font-weight: 600; }
        button:disabled { opacity: .55; cursor: default; }
        button.primary { background: var(--terra, #2f7d38); border-color: var(--terra, #2f7d38); color: #fff; }
        button.cancel { background: #fff; border-color: var(--carrot, #e15a22); color: var(--carrot, #e15a22); }
        .prog { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; }
        .bar { height: 10px; border-radius: 999px; background: var(--paper, #f4f3ea); border: 1px solid #e7e4d6; overflow: hidden; }
        .fill { height: 100%; background: var(--terra, #2f7d38); transition: width .4s ease; }
        .phase { font-size: 13px; color: #6b7066; }
        .pendinghero { margin-top: 18px; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; border-top: 1px dashed #d8d4c4; padding-top: 16px; }
        .ph-img { display: flex; flex-direction: column; gap: 6px; }
        .ph-img img { width: 220px; height: 130px; object-fit: cover; border-radius: 10px; border: 1px solid #e7e4d6; cursor: grab; }
        .ph-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .gallery { margin-top: 18px; border-top: 1px dashed #d8d4c4; padding-top: 16px; }
        .ghead { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
        figure { margin: 0; position: relative; }
        figure img { width: 100%; height: 120px; object-fit: cover; border-radius: 10px; border: 1px solid #e7e4d6; cursor: grab; }
        .figctl { position: absolute; top: 6px; right: 6px; display: flex; gap: 4px; }
        .figctl button { padding: 2px 7px; font-size: 13px; border-radius: 7px; background: rgba(255,255,255,.92); }
        .failbox { width: 100%; height: 120px; display: grid; place-items: center; border-radius: 10px; border: 1px dashed var(--carrot, #e15a22); background: var(--paper, #f4f3ea); color: var(--carrot, #e15a22); font-size: 13px; font-weight: 600; }
        figcaption { font-size: 12px; color: #6b7066; margin-top: 4px; text-align: center; }
        .msg { margin-top: 12px; color: var(--olive, #225f27); font-weight: 600; }
      `}</style>
        </div>
    );
}