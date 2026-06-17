// src/components/Meditation.tsx
"use client";

export default function Meditation() {
    return (
        <section className="med">
            <div className="wrap">
                <div className="med-head">
                    <span className="kicker" style={{ color: "var(--olive)" }}>Mindful living</span>
                    <h2 className="med-title">Plum Village</h2>
                    <p className="med-quote">
                        “Time passes quickly and opportunity is lost. Each of us must strive to awaken. Do not squander your lives.”
                    </p>
                </div>

                <div className="med-panel">
                    <div className="med-grid">
                        <div className="med-video">
                            <iframe
                                src="https://www.youtube.com/embed/lTV4diwhf3w?rel=0"
                                title="Plum Village — Our Actions are Our True Legacy"
                                loading="lazy"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        </div>

                        <div className="med-text">
                            <h3 className="med-subtitle">Plum Village Meditation</h3>
                            <p>
                                Mindfulness is a mental state and practice that involves bringing one&apos;s attention and
                                awareness to the present moment, without judgment or attachment. It is often described as paying
                                deliberate attention to one&apos;s thoughts, feelings, bodily sensations, and the surrounding
                                environment. The practice originated in Buddhist traditions but has been adapted into many secular
                                forms, gaining popularity for its benefits to mental well-being and overall quality of life.
                                Through meditation, we focus attention on a single object — the breath, a bodily sensation, a
                                sound — gently acknowledging and releasing whatever thoughts arise. With practice, that
                                non-judgmental awareness grows into a greater capacity to be present and to meet each moment with
                                clarity and calm.
                            </p>
                            <a
                                className="med-watch"
                                href="https://www.youtube.com/watch?v=lTV4diwhf3w"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Watch on YouTube
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                    <path d="M5 12h14M13 6l6 6-6 6" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .med { padding: 76px 0; }
                .med-head { margin: 0 0 32px; }
                .med-title {
                    font-family: var(--display, "Fraunces", serif);
                    font-weight: 600;
                    font-size: clamp(44px, 3.6vw, 72px);
                    line-height: 1.03;
                    color: var(--ink, #1b2a1d);
                    margin: 8px 0 0;
                }
                .med-quote {
                    font-family: var(--display, "Fraunces", serif);
                    font-style: italic;
                    font-size: clamp(18px, 2vw, 23px);
                    line-height: 1.5;
                    color: var(--muted, #6b7568);
                    margin: 18px 0 0;
                    max-width: 680px;
                }
                .med-panel {
                    background: linear-gradient(135deg, #e8ece0 0%, #eef1e9 100%);
                    border: 1px solid var(--line, #e6e1d6);
                    border-radius: 24px;
                    padding: 30px;
                }
                .med-grid {
                    display: grid;
                    grid-template-columns: 1.05fr 0.95fr;
                    gap: 44px;
                    align-items: center;
                }
                .med-video {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    border-radius: 16px;
                    overflow: hidden;
                    background: #000;
                    box-shadow: 0 24px 54px -24px rgba(20, 30, 20, 0.6);
                }
                .med-video iframe {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    border: 0;
                }
                .med-subtitle {
                    font-family: var(--display, "Fraunces", serif);
                    color: var(--carrot, #E15A22);
                    font-size: clamp(25px, 2.7vw, 34px);
                    font-weight: 600;
                    line-height: 1.08;
                    margin: 0 0 14px;
                }
                .med-text p {
                    color: var(--ink, #1b2a1d);
                    font-size: 16px;
                    line-height: 1.72;
                    margin: 0;
                }
                .med-watch {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 18px;
                    font-weight: 700;
                    font-size: 14.5px;
                    color: var(--olive, #225F27);
                    text-decoration: none;
                }
                .med-watch:hover { text-decoration: underline; }
                @media (max-width: 880px) {
                    .med { padding: 52px 0; }
                    .med-panel { padding: 18px; }
                    .med-grid { grid-template-columns: 1fr; gap: 24px; }
                }
            `}</style>
        </section>
    );
}