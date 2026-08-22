// src/components/admin/NewsletterVideosSection.tsx
"use client";

// Admin editor for the home-page "join" band: its wording (heading, paragraph,
// and the signup form's placeholder/button/success text) plus the pool of videos
// that rotate in the band — one is picked at random on each home-page visit.
import { useRef, useState, useTransition } from "react";
import type { BandConfig } from "@/lib/band-config";
import { saveBandCopyAction, saveBandVideosAction } from "@/lib/actions/band";

export default function NewsletterVideosSection({ band }: { band: BandConfig }) {
    const [heading, setHeading] = useState(band.heading);
    const [body, setBody] = useState(band.body);
    const [placeholder, setPlaceholder] = useState(band.placeholder);
    const [button, setButton] = useState(band.button);
    const [success, setSuccess] = useState(band.success);
    const [videos, setVideos] = useState<string[]>(band.videos);

    const [copyMsg, setCopyMsg] = useState<string | null>(null);
    const [vidMsg, setVidMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [pending, start] = useTransition();
    const fileRef = useRef<HTMLInputElement>(null);

    const saveCopy = () =>
        start(async () => {
            setCopyMsg(null);
            const res = await saveBandCopyAction({ heading, body, placeholder, button, success });
            setCopyMsg(res.ok ? "Saved." : res.error ?? "Couldn't save.");
        });

    const persistVideos = (next: string[]) =>
        start(async () => {
            setVidMsg(null);
            const res = await saveBandVideosAction(next);
            if (res.ok) setVideos(next);
            else setVidMsg({ ok: false, text: res.error ?? "Couldn't save videos." });
        });

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setVidMsg(null);
        setUploading(true);
        try {
            const fd = new FormData();
            fd.set("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.path) {
                setVidMsg({ ok: false, text: data?.error ?? "Upload failed." });
            } else {
                persistVideos([...videos, String(data.path)]);
                setVidMsg({ ok: true, text: "Video added." });
            }
        } catch {
            setVidMsg({ ok: false, text: "Upload failed." });
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const removeVideo = (url: string) => persistVideos(videos.filter((v) => v !== url));

    return (
        <div className="settings-section">
            <div className="settings-section-head">
                <h2>Newsletter videos</h2>
                <p>Edit the join band at the foot of the home page, and manage the videos shown there — one is picked at random on each visit.</p>
            </div>

            <div className="nv-grid">
                <label className="nv-field">
                    <span>Heading</span>
                    <input value={heading} onChange={(e) => setHeading(e.target.value)} maxLength={160} />
                </label>
                <label className="nv-field">
                    <span>Paragraph</span>
                    <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} />
                </label>
                <div className="nv-row3">
                    <label className="nv-field"><span>Form placeholder</span><input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} maxLength={120} /></label>
                    <label className="nv-field"><span>Button label</span><input value={button} onChange={(e) => setButton(e.target.value)} maxLength={40} /></label>
                    <label className="nv-field"><span>Success message</span><input value={success} onChange={(e) => setSuccess(e.target.value)} maxLength={160} /></label>
                </div>
                <div className="nv-actions">
                    <button type="button" className="nv-btn" disabled={pending} onClick={saveCopy}>{pending ? "Saving…" : "Save wording"}</button>
                    {copyMsg ? <span className="nv-flash">{copyMsg}</span> : null}
                </div>
            </div>

            <div className="nv-videos">
                <div className="nv-videos-head">
                    <h3>Videos ({videos.length})</h3>
                    <label className={`nv-btn nv-upload${uploading || pending ? " busy" : ""}`}>
                        {uploading ? "Uploading…" : "Upload video"}
                        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden disabled={uploading || pending} onChange={onUpload} />
                    </label>
                </div>
                {vidMsg ? <p className={`nv-flash ${vidMsg.ok ? "ok" : "err"}`}>{vidMsg.text}</p> : null}
                {videos.length === 0 ? (
                    <p className="nv-empty">No videos yet — the band video area stays empty until you upload one.</p>
                ) : (
                    <div className="nv-vid-grid">
                        {videos.map((url) => (
                            <div key={url} className="nv-vid">
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                <video src={url} muted loop playsInline preload="metadata" onMouseOver={(e) => e.currentTarget.play().catch(() => {})} onMouseOut={(e) => e.currentTarget.pause()} />
                                <div className="nv-vid-foot">
                                    <span className="nv-vid-name" title={url}>{url.split("/").pop()}</span>
                                    <button type="button" className="nv-vid-x" disabled={pending} onClick={() => removeVideo(url)}>Remove</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <p className="nv-hint">MP4, WebM, or MOV, up to 64&nbsp;MB. A short, muted, looping clip works best — it autoplays as a silent background on the home page.</p>
            </div>

            <style jsx>{`
                .nv-grid { display: flex; flex-direction: column; gap: 14px; margin-bottom: 26px; }
                .nv-row3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
                .nv-field { display: flex; flex-direction: column; gap: 6px; }
                .nv-field span { font-size: 12.5px; font-weight: 600; color: var(--ink, #1c2317); }
                .nv-field input, .nv-field textarea {
                    border: 1px solid var(--line, #d9d5c8); border-radius: 8px; padding: 9px 11px;
                    font-size: 14px; font-family: inherit; background: #fff; color: var(--ink, #1c2317); width: 100%;
                }
                .nv-actions { display: flex; align-items: center; gap: 12px; margin-top: 2px; }
                .nv-btn { border: none; border-radius: 999px; padding: 9px 18px; font-size: 13.5px; font-weight: 600; background: var(--terra, #c2603a); color: #fff; cursor: pointer; }
                .nv-btn:disabled { opacity: 0.6; cursor: default; }
                .nv-flash { font-size: 13px; color: var(--muted, #6b7264); }
                .nv-flash.err { color: #9a3f1f; }
                .nv-flash.ok { color: var(--olive, #225f27); }
                .nv-videos-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-top: 1px dashed var(--line, #e0dccf); padding-top: 18px; }
                .nv-videos-head h3 { margin: 0; font-size: 16px; }
                .nv-upload { display: inline-flex; align-items: center; cursor: pointer; }
                .nv-empty { color: var(--muted, #6b7264); font-size: 14px; }
                .nv-vid-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
                .nv-vid { border: 1px solid var(--line, #e6e3da); border-radius: 12px; overflow: hidden; background: #faf8f1; }
                .nv-vid video { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; background: #000; }
                .nv-vid-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; }
                .nv-vid-name { font-size: 12px; color: var(--muted, #6b7264); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .nv-vid-x { border: none; background: transparent; color: #b23b2e; font-size: 12.5px; font-weight: 600; cursor: pointer; flex: none; }
                .nv-vid-x:disabled { opacity: 0.5; cursor: default; }
                .nv-hint { font-size: 12.5px; color: var(--muted, #6b7264); margin: 14px 0 0; }
            `}</style>
        </div>
    );
}
