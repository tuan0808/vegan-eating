"use client";

// Three-step upload: register (POST /api/staff-files) → PUT bytes straight to
// storage via XHR (for progress) → confirm (POST .../complete). Files go one at a
// time so a multi-GB batch doesn't saturate the uplink with parallel PUTs.

import Link from "next/link";
import { useRef, useState } from "react";
import { MAX_STAFF_FILE_BYTES as MAX_BYTES } from "@/lib/staff-files-config";
import { button, card, ghostButton, muted } from "../styles";

type Job = { file: File; progress: number; state: "queued" | "uploading" | "done" | "error"; error?: string };

function fmt(n: number): string {
    if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
    if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function put(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        // Every header here is part of the signature — send them exactly as given.
        for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}).`)));
        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.send(file);
    });
}

export default function StaffUploader() {
    const input = useRef<HTMLInputElement>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [note, setNote] = useState("");
    const [running, setRunning] = useState(false);

    const patch = (i: number, p: Partial<Job>) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...p } : j)));

    const pick = (list: FileList | null) => {
        if (!list) return;
        setJobs((js) => [
            ...js.filter((j) => j.state !== "done"),
            ...Array.from(list).map<Job>((file) =>
                file.size > MAX_BYTES
                    ? { file, progress: 0, state: "error", error: "Over the 2 GB limit." }
                    : { file, progress: 0, state: "queued" },
            ),
        ]);
        if (input.current) input.current.value = "";
    };

    const start = async () => {
        setRunning(true);
        for (let i = 0; i < jobs.length; i++) {
            const { file, state } = jobs[i];
            if (state !== "queued") continue;
            patch(i, { state: "uploading", progress: 0 });
            let id: string | null = null;
            try {
                const r = await fetch("/api/staff-files", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: file.name, size: file.size, type: file.type, note }),
                });
                const reg = await r.json().catch(() => null);
                if (!r.ok) throw new Error(reg?.error ?? "Couldn't start upload.");
                id = reg.id;
                await put(reg.uploadUrl, file, reg.headers, (p) => patch(i, { progress: p }));
                const c = await fetch(`/api/staff-files/${id}/complete`, { method: "POST" });
                if (!c.ok) throw new Error((await c.json().catch(() => null))?.error ?? "Couldn't finish upload.");
                patch(i, { state: "done", progress: 1 });
            } catch (e) {
                // Drop the half-registered row so it doesn't linger as PENDING.
                if (id) fetch(`/api/staff-files/${id}`, { method: "DELETE" }).catch(() => {});
                patch(i, { state: "error", error: e instanceof Error ? e.message : "Upload failed." });
            }
        }
        setRunning(false);
    };

    const queued = jobs.some((j) => j.state === "queued");
    const anyDone = jobs.some((j) => j.state === "done");

    return (
        <div style={{ ...card, marginTop: 24 }}>
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (!running) pick(e.dataTransfer.files);
                }}
                onClick={() => !running && input.current?.click()}
                style={{
                    border: "2px dashed var(--line, #d9d5c8)",
                    borderRadius: 12,
                    padding: "36px 20px",
                    textAlign: "center",
                    cursor: running ? "default" : "pointer",
                    ...muted,
                }}
            >
                <strong style={{ color: "var(--ink, #1c2317)" }}>Drop files here</strong> or click to choose
                <input ref={input} type="file" multiple hidden onChange={(e) => pick(e.target.files)} />
            </div>

            <label style={{ display: "block", marginTop: 16, fontSize: 13.5, fontWeight: 600 }}>
                Note (optional, applies to this batch)
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    disabled={running}
                    placeholder="e.g. Episode 4 B-roll, camera A"
                    style={{
                        display: "block", width: "100%", marginTop: 6, padding: "9px 12px", fontSize: 14,
                        border: "1px solid var(--line, #d9d5c8)", borderRadius: 10, background: "#fff",
                    }}
                />
            </label>

            {jobs.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: "18px 0 0" }}>
                    {jobs.map((j, i) => (
                        <li key={i} style={{ padding: "10px 0", borderTop: "1px solid var(--line, #e6e3da)", fontSize: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                <span style={{ wordBreak: "break-all" }}>{j.file.name}</span>
                                <span style={{ ...muted, whiteSpace: "nowrap" }}>
                                    {fmt(j.file.size)} ·{" "}
                                    {j.state === "uploading" ? `${Math.floor(j.progress * 100)}%`
                                        : j.state === "done" ? "Uploaded"
                                        : j.state === "error" ? "Failed"
                                        : "Ready"}
                                </span>
                            </div>
                            {j.state === "uploading" && (
                                <div style={{ height: 6, background: "var(--line, #e6e3da)", borderRadius: 999, marginTop: 6 }}>
                                    <div style={{ height: 6, width: `${j.progress * 100}%`, background: "var(--terra, #c2603a)", borderRadius: 999 }} />
                                </div>
                            )}
                            {j.error && <div style={{ color: "#b23e26", fontSize: 13, marginTop: 4 }}>{j.error}</div>}
                        </li>
                    ))}
                </ul>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
                <button type="button" onClick={start} disabled={!queued || running} style={{ ...button, opacity: !queued || running ? 0.5 : 1 }}>
                    {running ? "Uploading…" : "Upload"}
                </button>
                {!running && jobs.length > 0 && (
                    <button type="button" onClick={() => setJobs([])} style={ghostButton}>Clear</button>
                )}
                {anyDone && !running && (
                    <Link href="/admin/files" style={{ color: "var(--terra, #c2603a)", fontWeight: 600, marginLeft: "auto" }}>
                        View downloads →
                    </Link>
                )}
            </div>
        </div>
    );
}
