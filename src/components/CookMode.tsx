// src/components/CookMode.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractTimer, stepIngredientIndices } from "@/lib/recipe-scale";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export default function CookMode({
                                     open, onClose, title, steps, ingredients, timing,
                                 }: {
    open: boolean;
    onClose: () => void;
    title: string;
    steps: string[];
    ingredients: string[];
    timing?: string;
}) {
    const [i, setI] = useState(0);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [running, setRunning] = useState(false);
    const [showIng, setShowIng] = useState(false);
    const [listening, setListening] = useState(false);
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wakeRef = useRef<any>(null);
    const acRef = useRef<AudioContext | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recRef = useRef<any>(null);
    const touchX = useRef<number | null>(null);
    const swiped = useRef(false);

    const stepText = steps[i] ?? "";
    const timerSecs = extractTimer(stepText);
    const atEnd = i >= steps.length - 1;
    const usedHere = stepIngredientIndices(stepText, ingredients);

    const goNext = useCallback(() => setI((p) => Math.min(steps.length - 1, p + 1)), [steps.length]);
    const goBack = useCallback(() => setI((p) => Math.max(0, p - 1)), []);

    // ---- keep the screen awake ----
    useEffect(() => {
        if (!open) return;
        const request = async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            try { wakeRef.current = await (navigator as any).wakeLock?.request("screen"); } catch { /* noop */ }
        };
        request();
        const onVis = () => { if (document.visibilityState === "visible") request(); };
        document.addEventListener("visibilitychange", onVis);
        return () => {
            document.removeEventListener("visibilitychange", onVis);
            try { wakeRef.current?.release?.(); } catch { /* noop */ }
            wakeRef.current = null;
        };
    }, [open]);

    useEffect(() => { if (open) { setI(0); setRunning(false); } }, [open]);
    useEffect(() => { setRemaining(timerSecs); setRunning(false); /* eslint-disable-next-line */ }, [i, open]);

    // ---- timer countdown ----
    useEffect(() => {
        if (!running || remaining == null) return;
        if (remaining <= 0) { setRunning(false); beep(); vibrate(); return; }
        const t = setTimeout(() => setRemaining((r) => (r == null ? null : r - 1)), 1000);
        return () => clearTimeout(t);
    }, [running, remaining]);

    function ensureAudio() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { if (!acRef.current) acRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); acRef.current?.resume?.(); } catch { /* noop */ }
    }
    function beep() {
        try {
            const ac = acRef.current; if (!ac) return;
            const o = ac.createOscillator(); const g = ac.createGain();
            o.connect(g); g.connect(ac.destination); o.type = "sine"; o.frequency.value = 880;
            g.gain.setValueAtTime(0.0001, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.7);
            o.start(); o.stop(ac.currentTime + 0.72);
        } catch { /* noop */ }
    }
    function vibrate() { try { navigator.vibrate?.([200, 100, 200]); } catch { /* noop */ } }

    const startTimer = useCallback(() => {
        if (timerSecs == null) return;
        ensureAudio();
        setRemaining((r) => (r == null || r <= 0 ? timerSecs : r));
        setRunning(true);
    }, [timerSecs]);

    // ---- keyboard control ----
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            const onButton = tag === "BUTTON" || tag === "INPUT";
            if (e.key === "ArrowRight" || (!onButton && (e.key === " " || e.key === "Enter"))) { e.preventDefault(); goNext(); }
            else if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
            else if (e.key === "Escape") { onClose(); }
            else if (e.key.toLowerCase() === "t") { running ? setRunning(false) : startTimer(); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, goNext, goBack, startTimer, running]);

    // ---- swipe control ----
    const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.changedTouches[0].clientX; swiped.current = false; };
    const onTouchEnd = (e: React.TouchEvent) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 45) { swiped.current = true; dx < 0 ? goNext() : goBack(); }
        touchX.current = null;
    };
    const onStageClick = () => { if (swiped.current) { swiped.current = false; return; } if (!atEnd) goNext(); };

    // ---- voice control ----
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;

    const stopVoice = useCallback(() => {
        const r = recRef.current; recRef.current = null;
        try { r?.stop(); } catch { /* noop */ }
        setListening(false);
    }, []);

    const startVoice = useCallback(() => {
        if (!SR) return;
        const rec = new SR();
        rec.continuous = true; rec.interimResults = false; rec.lang = "en-US";
        rec.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } }; resultIndex: number }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res: any = e;
            const txt = String(res.results[res.results.length - 1][0].transcript || "").toLowerCase();
            if (/\b(next|forward|continue)\b/.test(txt)) goNext();
            else if (/\b(back|previous)\b/.test(txt)) goBack();
            else if (/\bstart\b|\bbegin\b|\btimer\b/.test(txt)) startTimer();
            else if (/\b(pause|stop)\b/.test(txt)) setRunning(false);
            else if (/\breset\b/.test(txt)) { setRunning(false); setRemaining(timerSecs); }
            else if (/\b(finish|exit|close)\b/.test(txt)) onClose();
        };
        rec.onend = () => { if (recRef.current) { try { rec.start(); } catch { /* noop */ } } };
        rec.onerror = () => { /* ignore transient errors; onend will restart if still listening */ };
        recRef.current = rec;
        try { rec.start(); setListening(true); } catch { /* noop */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [SR, goNext, goBack, startTimer, timerSecs]);

    // stop voice + reset listening when closing/unmounting
    useEffect(() => { if (!open) stopVoice(); return () => stopVoice(); }, [open, stopVoice]);

    if (!open) return null;

    return (
        <div className="cm" role="dialog" aria-label="Cook mode" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="cm-top">
                <div className="cm-head">
                    <span className="cm-title">{title}</span>
                    {timing && <span className="cm-timing">{timing}</span>}
                </div>
                <div className="cm-top-btns">
                    {mounted && SR && (
                        <button
                            className={`cm-mic${listening ? " on" : ""}`}
                            onClick={() => (listening ? stopVoice() : startVoice())}
                            aria-label={listening ? "Turn voice control off" : "Turn voice control on"}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v4" />
                            </svg>
                            {listening ? "Listening…" : "Voice"}
                        </button>
                    )}
                    <button className="cm-x" onClick={onClose} aria-label="Exit cook mode">Done ✕</button>
                </div>
            </div>

            <div className="cm-progress">
                {steps.map((_, n) => (
                    <span key={n} className={`cm-dot${n === i ? " on" : ""}${n < i ? " done" : ""}`} />
                ))}
            </div>

            <div className="cm-stage" onClick={onStageClick}>
                <span className="cm-count">Step {i + 1} <i>/ {steps.length}</i></span>
                <p className="cm-step">{stepText}</p>

                {usedHere.length > 0 && (
                    <div className="cm-uses" onClick={(e) => e.stopPropagation()}>
                        <span className="cm-uses-lbl">For this step</span>
                        <div className="cm-chips">
                            {usedHere.map((idx) => <span key={idx} className="cm-chip">{ingredients[idx]}</span>)}
                        </div>
                    </div>
                )}

                {timerSecs != null && (
                    <div className="cm-timer" onClick={(e) => e.stopPropagation()}>
                        <span className="cm-time">{mmss(remaining ?? timerSecs)}</span>
                        <div className="cm-timer-btns">
                            <button onClick={() => (running ? setRunning(false) : startTimer())}>
                                {running ? "Pause" : (remaining != null && remaining < timerSecs ? "Resume" : "Start timer")}
                            </button>
                            <button onClick={() => { setRunning(false); setRemaining(timerSecs); }}>Reset</button>
                        </div>
                    </div>
                )}

                {!atEnd && <span className="cm-tap">tap, swipe, or press → to continue</span>}
            </div>

            <div className="cm-nav" onClick={(e) => e.stopPropagation()}>
                <button disabled={i === 0} onClick={goBack}>← Back</button>
                <button className="peek" onClick={() => setShowIng(true)}>All ingredients</button>
                {atEnd
                    ? <button className="next" onClick={onClose}>Finish ✓</button>
                    : <button className="next" onClick={goNext}>Next →</button>}
            </div>

            {showIng && (
                <div className="cm-sheet" onClick={() => setShowIng(false)}>
                    <div className="cm-sheet-card" onClick={(e) => e.stopPropagation()}>
                        <h3>Ingredients</h3>
                        <ul>{ingredients.map((ing, n) => <li key={n}>{ing}</li>)}</ul>
                        <button onClick={() => setShowIng(false)}>Close</button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .cm { position: fixed; inset: 0; z-index: 1000; background: #14241a; color: #f3f2ea;
                    display: flex; flex-direction: column; font-family: "Hanken Grotesk", sans-serif; touch-action: pan-y; }
                .cm-top { display: flex; justify-content: space-between; align-items: center;
                    padding: 16px 22px; border-bottom: 1px solid rgba(255,255,255,.12); }
                .cm-title { font-family: "Fraunces", serif; font-size: 18px; color: #cdd8c6; }
                .cm-head { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
                .cm-timing { font-size: 12.5px; color: #9bb295; }
                .cm-top-btns { display: flex; gap: 10px; align-items: center; }
                .cm-mic { display: inline-flex; align-items: center; gap: 7px; background: rgba(255,255,255,.1);
                    color: #fff; border: 0; border-radius: 999px; padding: 9px 14px; font-weight: 600; font-size: 13.5px; cursor: pointer; }
                .cm-mic.on { background: #E15A22; }
                .cm-mic.on svg { animation: cm-pulse 1.2s ease-in-out infinite; }
                @keyframes cm-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
                .cm-x { background: rgba(255,255,255,.1); color: #fff; border: 0; border-radius: 999px;
                    padding: 9px 16px; font-weight: 600; cursor: pointer; font-size: 14px; }
                .cm-progress { display: flex; gap: 5px; padding: 16px 22px 0; flex-wrap: wrap; }
                .cm-dot { height: 4px; flex: 1; min-width: 6px; border-radius: 2px; background: rgba(255,255,255,.16); transition: background .2s; }
                .cm-dot.done { background: #5BB35F; }
                .cm-dot.on { background: #A7D98C; }
                .cm-stage { flex: 1; display: flex; flex-direction: column; justify-content: center;
                    padding: 24px 28px; cursor: pointer; max-width: 900px; margin: 0 auto; width: 100%; user-select: none; }
                .cm-count { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #9bb295; font-weight: 700; }
                .cm-count i { font-style: normal; opacity: .55; }
                .cm-step { font-size: clamp(26px, 4.6vw, 44px); line-height: 1.32; margin: 18px 0 0; font-weight: 500; }
                .cm-uses { margin-top: 24px; }
                .cm-uses-lbl { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: #9bb295; font-weight: 700; }
                .cm-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
                .cm-chip { background: rgba(91,179,95,.16); color: #cdeccd; border: 1px solid rgba(91,179,95,.35);
                    border-radius: 999px; padding: 7px 14px; font-size: 14px; font-weight: 500; }
                .cm-tap { display: block; margin-top: 30px; font-size: 13px; color: rgba(255,255,255,.4); letter-spacing: .04em; }
                .cm-timer { margin-top: 30px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
                .cm-time { font-family: "Fraunces", serif; font-size: clamp(40px, 8vw, 64px);
                    font-variant-numeric: tabular-nums; color: #fff; }
                .cm-timer-btns { display: flex; gap: 10px; }
                .cm-timer-btns button { background: #5BB35F; color: #0c1a11; border: 0; border-radius: 12px;
                    padding: 12px 22px; font-weight: 700; font-size: 15px; cursor: pointer; }
                .cm-timer-btns button:last-child { background: rgba(255,255,255,.12); color: #fff; }
                .cm-nav { display: flex; gap: 12px; align-items: center; padding: 16px 22px 24px;
                    border-top: 1px solid rgba(255,255,255,.12); max-width: 900px; margin: 0 auto; width: 100%; }
                .cm-nav button { background: rgba(255,255,255,.1); color: #fff; border: 0; border-radius: 12px;
                    padding: 15px 22px; font-weight: 600; font-size: 16px; cursor: pointer; }
                .cm-nav button:disabled { opacity: .35; cursor: default; }
                .cm-nav .peek { margin-left: auto; }
                .cm-nav .next { background: #E15A22; }
                .cm-sheet { position: fixed; inset: 0; background: rgba(0,0,0,.5);
                    display: flex; align-items: flex-end; justify-content: center; z-index: 1100; }
                .cm-sheet-card { background: #1b2a1d; border-radius: 20px 20px 0 0; padding: 24px;
                    width: 100%; max-width: 560px; max-height: 72vh; overflow: auto; }
                .cm-sheet-card h3 { font-family: "Fraunces", serif; margin: 0 0 14px; }
                .cm-sheet-card ul { list-style: none; padding: 0; margin: 0 0 18px; display: flex; flex-direction: column; gap: 10px; }
                .cm-sheet-card li { font-size: 16px; color: #dfe7da; border-bottom: 1px solid rgba(255,255,255,.08); padding-bottom: 10px; }
                .cm-sheet-card > button { background: #5BB35F; color: #0c1a11; border: 0; border-radius: 12px;
                    padding: 13px 22px; font-weight: 700; width: 100%; cursor: pointer; }
                @media (max-width: 560px) { .cm-nav button { padding: 14px 14px; font-size: 15px; } .cm-mic span { display: none; } }
            `}</style>
        </div>
    );
}