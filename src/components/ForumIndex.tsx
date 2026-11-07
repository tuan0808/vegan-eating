// src/components/ForumIndex.tsx
"use client";

import Link from "next/link";
import type { CategoryBlock } from "@/lib/forum";

// Alternating warm tones so the list reads as a distinct block that offsets from
// the page: tone A sits just above the paper colour, tone B just below it.
const ROW_BG = ["#faf8f1", "#ebe8dc"];

export default function ForumIndex({ categories }: { categories: CategoryBlock[] }) {
    return (
        <div className="forum-band">
        <div className="forum-wrap">
            {categories.map((cat) => {
                const accent = cat.accent;
                return (
                    <section key={cat.id} className="cat">
                        <div className="cat-head">
                            <div className="kick">
                                <span className="kick-dot" style={{ background: accent }} aria-hidden />
                                <span className="kick-label" style={{ color: accent }}>{cat.name}</span>
                            </div>
                            {cat.description ? <p className="cat-desc">{cat.description}</p> : null}
                        </div>

                        <div className="board">
                            {cat.forums.map((f, j) => (
                                <Link
                                    key={f.id}
                                    href={`/forum/${cat.slug}/${f.slug}`}
                                    className="forum-row"
                                    style={{ background: ROW_BG[j % 2] }}
                                >
                                    {/* Layout lives on this div, not the <a>, so global link styles can't break it */}
                                    <div className="row-inner">
                    <span className="avatar" style={{ background: accent }} aria-hidden>
                      {f.name.charAt(0).toUpperCase()}
                    </span>

                                        <div className="forum-main">
                                            <span className="forum-name">{f.name}</span>
                                            {f.description ? <span className="forum-desc">{f.description}</span> : null}
                                            <span className="forum-meta">
                        {f.lastPost ? (
                            <>
                                Latest: <em>{f.lastPost.threadTitle}</em> · by {f.lastPost.author} · {f.lastPost.at}
                            </>
                        ) : (
                            <span className="muted-italic">No posts yet</span>
                        )}
                      </span>
                                        </div>

                                        <div className="count">
                                            <b>{f.threadCount}</b>
                                            <span>{f.threadCount === 1 ? "thread" : "threads"}</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                );
            })}

            <style jsx>{`
                .forum-wrap {
                    max-width: var(--maxw);
                    margin: 0 auto;
                    padding: 8px 28px 90px;
                    display: flex;
                    flex-direction: column;
                    gap: 22px;
                }

                /* Kill any global <section> margin — the flex gap above is the only
                   thing that should separate categories. This is what was creating
                   the oversized gaps. */
                .cat {
                    margin: 0;
                }

                /* ---- Category heading ---- */
                .cat-head {
                    padding-left: 4px;
                }
                .kick {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                }
                .kick-dot {
                    width: 9px;
                    height: 9px;
                    border-radius: 50%;
                }
                .kick-label {
                    font-size: 12.5px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                }
                .cat-desc {
                    margin: 8px 0 0;
                    color: var(--muted, #6b7264);
                    font-size: 14.5px;
                }

                /* ---- Board ---- */
                /* Contiguous alternating bands (see ROW_BG) — the offset tones
                   define the block against the page; no borders or gaps. */
                .board {
                    margin-top: 14px;
                    display: flex;
                    flex-direction: column;
                }
                .forum-row {
                    display: block;
                    text-decoration: none;
                    color: inherit;
                    /* background set inline (alternating ROW_BG) */
                    transition: filter 0.15s ease;
                }
                .forum-row:hover {
                    filter: brightness(0.965);
                }
                .forum-row:hover .forum-name {
                    color: var(--terra, #2f7d38);
                }
                .forum-name {
                    transition: color 0.15s ease;
                }

                /* The actual layout — a div, immune to global <a> rules */
                .row-inner {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 22px 22px;
                }

                .avatar {
                    flex-shrink: 0;
                    width: 44px;
                    height: 44px;
                    margin-top: 2px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 18px;
                    font-weight: 600;
                    line-height: 1;
                }

                .forum-main {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .forum-name {
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 22px;
                    font-weight: 600;
                    color: var(--ink, #1c2317);
                    line-height: 1.15;
                }
                .forum-desc {
                    font-size: 14px;
                    color: var(--muted, #6b7264);
                }
                .forum-meta {
                    font-size: 13px;
                    color: var(--muted, #6b7264);
                    margin-top: 1px;
                }
                .forum-meta :global(em) {
                    font-style: normal;
                    color: var(--ink, #1c2317);
                }
                .muted-italic {
                    font-style: italic;
                }

                .count {
                    flex-shrink: 0;
                    margin-left: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 1px;
                    white-space: nowrap;
                    min-width: 60px;
                }
                .count b {
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 30px;
                    font-weight: 700;
                    color: var(--ink, #1c2317);
                    line-height: 1;
                }
                .count span {
                    font-size: 12.5px;
                    color: var(--muted, #6b7264);
                }

                @media (max-width: 720px) {
                    .row-inner {
                        gap: 12px;
                        padding: 14px 12px;
                    }
                    .avatar {
                        width: 40px;
                        height: 40px;
                        font-size: 16px;
                    }
                    .forum-name {
                        font-size: 20px;
                    }
                    .count b {
                        font-size: 24px;
                    }
                }
            `}</style>
        </div>
        </div>
    );
}