// src/components/HomeSearch.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PHRASES = [
    "what's in your fridge?",
    "half a butternut squash…",
    "a tin of chickpeas…",
    "leftover spinach + lemon…",
    "whatever's about to turn…",
];

const INGREDIENTS = ["chickpeas", "spinach", "tofu", "sweet potato", "lentils", "coconut milk", "mushrooms"];

const Sprout = () => (
    <svg className="sprout" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12" />
        <path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6Z" />
        <path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5Z" />
    </svg>
);

const Dice = () => (
    <svg className="dice-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" />
        <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" />
        <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" />
    </svg>
);

const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

export default function HomeSearch() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [picked, setPicked] = useState<string[]>([]);
    const [placeholder, setPlaceholder] = useState("");
    const [spinning, setSpinning] = useState(false);

    // typewriter placeholder — pauses while the user has typed or selected anything
    const active = query.length > 0 || picked.length > 0;
    const state = useRef({ pi: 0, ci: 0, deleting: false });
    useEffect(() => {
        if (active) return; // don't animate over real input
        let timer: ReturnType<typeof setTimeout>;
        const tick = () => {
            const s = state.current;
            const full = PHRASES[s.pi];
            setPlaceholder(full.slice(0, s.ci));
            if (!s.deleting && s.ci < full.length) {
                s.ci++;
                timer = setTimeout(tick, 70);
            } else if (!s.deleting && s.ci === full.length) {
                s.deleting = true;
                timer = setTimeout(tick, 1500);
            } else if (s.deleting && s.ci > 0) {
                s.ci--;
                timer = setTimeout(tick, 34);
            } else {
                s.deleting = false;
                s.pi = (s.pi + 1) % PHRASES.length;
                timer = setTimeout(tick, 220);
            }
        };
        tick();
        return () => clearTimeout(timer);
    }, [active]);

    const toggle = (ing: string) => {
        setPicked((prev) => {
            const next = prev.includes(ing) ? prev.filter((x) => x !== ing) : [...prev, ing];
            setQuery(next.join(", "));
            return next;
        });
    };

    const submit = () => {
        const q = query.trim();
        if (!q) return;
        router.push(`/recipes?q=${encodeURIComponent(q)}`);
    };

    const surprise = () => {
        setSpinning(true);
        // let the dice finish its roll, then jump to a random recipe
        setTimeout(() => router.push("/recipes/random"), 450);
    };

    return (
        <section className="hs">
            <div className="hs-wrap">
                <span className="hs-kicker">Start with your kitchen</span>
                <h2 className="hs-title">What can you cook tonight?</h2>

                <div className="hs-field">
                    <Sprout />
                    <input
                        className="hs-input"
                        value={query}
                        placeholder={active ? "" : placeholder}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setPicked([]);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && submit()}
                        aria-label="Search recipes by ingredients"
                    />
                    <button
                        type="button"
                        className={`hs-dice${spinning ? " spin" : ""}`}
                        onClick={surprise}
                        aria-label="Surprise me with a random recipe"
                    >
                        <Dice />
                        <span className="hs-dice-label">Surprise me</span>
                    </button>
                    <button className="hs-go" onClick={submit}>
                        Find recipes <Arrow />
                    </button>
                </div>

                <div className="hs-chips">
                    <span className="hs-lbl">I’ve got…</span>
                    {INGREDIENTS.map((ing) => {
                        const on = picked.includes(ing);
                        return (
                            <button key={ing} className={`hs-chip${on ? " on" : ""}`} onClick={() => toggle(ing)}>
                                {ing}
                                <span className="hs-x">×</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <style jsx>{`
                .hs {
                    border-top: 1px solid var(--line, rgba(27, 42, 29, 0.1));
                    border-bottom: 1px solid var(--line, rgba(27, 42, 29, 0.1));
                    background:
                            radial-gradient(120% 140% at 0% 0%, rgba(31, 74, 47, 0.04), transparent 60%),
                            var(--paper, #f3f2ea);
                    padding: 56px 0;
                }
                .hs-wrap {
                    max-width: 860px;
                    margin: 0 auto;
                    padding: 0 28px;
                }
                .hs-kicker {
                    font-family: "Hanken Grotesk", sans-serif;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.14em;
                    text-transform: uppercase;
                    color: var(--olive, #5c6e3f);
                }
                .hs-title {
                    font-family: "Fraunces", serif;
                    font-weight: 500;
                    font-size: clamp(26px, 4vw, 38px);
                    line-height: 1.1;
                    margin: 10px 0 26px;
                    color: var(--ink, #1b2a1d);
                }
                .hs-field {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    background: var(--card, #fffdf7);
                    border: 1.5px solid var(--line, rgba(27, 42, 29, 0.12));
                    border-radius: 16px;
                    padding: 6px 8px 6px 22px;
                    transition: border-color 0.25s, box-shadow 0.25s;
                }
                .hs-field:focus-within {
                    border-color: var(--green, #1f4a2f);
                    box-shadow: 0 0 0 4px rgba(31, 74, 47, 0.08);
                }
                .hs-field :global(.sprout) {
                    flex: none;
                    color: var(--green, #1f4a2f);
                    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .hs-field:focus-within :global(.sprout) {
                    transform: translateY(-2px) rotate(-6deg) scale(1.08);
                }
                .hs-input {
                    flex: 1;
                    border: 0;
                    background: transparent;
                    outline: none;
                    font-family: "Hanken Grotesk", sans-serif;
                    font-size: 19px;
                    color: var(--ink, #1b2a1d);
                    padding: 18px 0;
                    min-width: 0;
                }
                .hs-input::placeholder {
                    color: var(--muted, #6f7468);
                    opacity: 1;
                }
                .hs-dice {
                    flex: none;
                    border: 0;
                    border-right: 1px solid var(--line, rgba(27, 42, 29, 0.14));
                    cursor: pointer;
                    background: transparent;
                    color: var(--olive, #5c6e3f);
                    padding: 0 16px 0 6px;
                    height: 28px;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                    font-family: "Hanken Grotesk", sans-serif;
                    font-size: 13px;
                    font-weight: 600;
                    transition: color 0.2s;
                }
                .hs-dice:hover {
                    color: var(--carrot, #cf6a3c);
                }
                .hs-dice :global(.dice-icon) {
                    transition: transform 0.45s ease;
                }
                .hs-dice.spin :global(.dice-icon) {
                    animation: hs-roll 0.45s ease;
                }
                @keyframes hs-roll {
                    0% { transform: rotate(0); }
                    100% { transform: rotate(360deg); }
                }
                .hs-go {
                    flex: none;
                    border: 0;
                    cursor: pointer;
                    background: var(--green, #1f4a2f);
                    color: #fff;
                    border-radius: 12px;
                    padding: 0 26px;
                    height: 52px;
                    font-family: "Hanken Grotesk", sans-serif;
                    font-weight: 600;
                    font-size: 15px;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    transition: background 0.2s, transform 0.1s;
                }
                .hs-go:hover {
                    background: #173b25;
                }
                .hs-go:active {
                    transform: scale(0.97);
                }
                .hs-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 9px;
                    margin-top: 20px;
                    align-items: center;
                }
                .hs-lbl {
                    font-size: 13px;
                    color: var(--muted, #6f7468);
                    margin-right: 4px;
                    font-weight: 600;
                }
                .hs-chip {
                    border: 1px solid var(--line, rgba(27, 42, 29, 0.12));
                    background: transparent;
                    border-radius: 999px;
                    padding: 8px 15px;
                    font-family: "Hanken Grotesk", sans-serif;
                    font-size: 13.5px;
                    color: var(--ink, #1b2a1d);
                    cursor: pointer;
                    transition: 0.18s;
                    display: inline-flex;
                    align-items: center;
                    gap: 7px;
                }
                .hs-chip:hover {
                    border-color: var(--olive, #5c6e3f);
                    background: #fff;
                }
                .hs-chip.on {
                    background: var(--green-soft, #dfe7da);
                    border-color: transparent;
                    color: var(--green, #1f4a2f);
                    font-weight: 600;
                }
                .hs-x {
                    opacity: 0;
                    width: 0;
                    overflow: hidden;
                    transition: 0.18s;
                }
                .hs-chip.on .hs-x {
                    opacity: 1;
                    width: 12px;
                }
                @media (max-width: 620px) {
                    .hs-field {
                        flex-wrap: wrap;
                        padding: 14px 16px;
                        gap: 10px;
                    }
                    .hs-input {
                        flex: 1 1 100%;
                        padding: 4px 0;
                        order: 1;
                    }
                    .hs-dice {
                        order: 2;
                        border-right: 0;
                        padding-left: 0;
                    }
                    .hs-go {
                        order: 3;
                        margin-left: auto;
                    }
                }
            `}</style>
        </section>
    );
}