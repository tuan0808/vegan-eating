// src/components/ThreadList.tsx
"use client";

import Link from "next/link";
import type { ThreadRow } from "@/lib/forum";

export default function ThreadList({
                                       threads,
                                       accent,
                                       categorySlug,
                                       forumSlug,
                                   }: {
    threads: ThreadRow[];
    accent: string;
    categorySlug: string;
    forumSlug: string;
}) {
    return (
        <div className="forum-band">
        <div className="thread-wrap">
            {threads.length === 0 ? (
                <div className="empty">
                    <p className="empty-title">No threads here yet.</p>
                    <p className="empty-sub">Once accounts are live, this is where new topics will start.</p>
                </div>
            ) : (
                <div className="thread-list">
                    {threads.map((t) => {
                        const flair = t.pinned ? (t.tag ? `Pinned · ${t.tag}` : "Pinned") : t.tag;
                        return (
                            <Link
                                key={t.id}
                                href={`/forum/${categorySlug}/${forumSlug}/${t.slug}`}
                                className={`thread-row${t.pinned ? " is-pinned" : ""}`}
                                style={{ borderLeftColor: accent }}
                            >
                                {/* layout on the div, not the <a>, so global link styles can't break it */}
                                <div className="row-inner">
                  <span className="avatar" style={{ background: t.avatarColor }} aria-hidden>
                    {t.startedByInitial}
                  </span>

                                    <div className="main">
                                        {flair ? (
                                            <div className="flair">
                                                <span className="dot" style={{ background: accent }} aria-hidden />
                                                <span className="flair-label" style={{ color: accent }}>{flair}</span>
                                            </div>
                                        ) : null}

                                        <span className="title">
                      {t.title}
                                            {t.locked ? <span className="lock"> · Locked</span> : null}
                    </span>

                                        <span className="meta">
                      Started by {t.startedBy} · {t.startedAt} · last reply by {t.lastReplyBy}
                    </span>
                                    </div>

                                    <div className="count">
                                        <b>{t.replies}</b>
                                        <span>{t.replies === 1 ? "reply" : "replies"}</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            <style jsx>{`
                .thread-wrap {
                    max-width: var(--maxw);
                    margin: 0 auto;
                    padding: 8px 28px 90px;
                }
                .thread-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                /* Each thread is now a distinct card — background, border, and a
                   board-accent left stripe (colour set inline) — so rows read as
                   their own objects instead of melting into the page. hover/lift +
                   green title live in globals.css (.thread-row). */
                .thread-row {
                    display: block;
                    text-decoration: none;
                    color: inherit;
                    background: #fff;
                    border: 1px solid rgba(28, 42, 26, 0.16);
                    border-left-width: 5px;
                    border-radius: 14px;
                    box-shadow: 0 8px 20px -10px rgba(28, 35, 23, 0.18), 0 2px 5px -3px rgba(28, 35, 23, 0.1);
                }
                .thread-row.is-pinned {
                    background: linear-gradient(180deg, var(--green-soft, #dfe7da), #fff 64%);
                }
                .row-inner {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    padding: 20px 20px;
                }
                .avatar {
                    flex-shrink: 0;
                    width: 52px;
                    height: 52px;
                    margin-top: 2px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 20px;
                    font-weight: 600;
                    line-height: 1;
                }
                .main {
                    flex: 1;
                    min-width: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                }
                .flair {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                .flair-label {
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                }
                .title {
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 23px;
                    font-weight: 600;
                    color: var(--ink, #1c2317);
                    line-height: 1.2;
                    transition: color 0.16s ease;
                }
                .lock {
                    color: var(--muted, #6b7264);
                    font-family: var(--body, system-ui, sans-serif);
                    font-size: 15px;
                    font-weight: 500;
                }
                .meta {
                    font-size: 13.5px;
                    color: var(--muted, #6b7264);
                }
                .count {
                    flex-shrink: 0;
                    margin-left: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    white-space: nowrap;
                    min-width: 72px;
                    padding: 10px 6px;
                    border-radius: 12px;
                    background: var(--paper-2, #fcfbf4);
                    border: 1px solid var(--line, #dee3cf);
                }
                .count b {
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--ink, #1c2317);
                    line-height: 1;
                }
                .count span {
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--muted, #6b7264);
                }
                .empty {
                    text-align: center;
                    padding: 60px 20px;
                    border: 1px dashed var(--line, #ddd9cd);
                    border-radius: 16px;
                    background: #faf8f1;
                }
                .empty-title {
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 20px;
                    color: var(--ink, #1c2317);
                    margin: 0;
                }
                .empty-sub {
                    color: var(--muted, #6b7264);
                    font-size: 14px;
                    margin: 8px 0 0;
                }
                @media (max-width: 720px) {
                    .row-inner {
                        gap: 14px;
                        padding: 18px 12px;
                    }
                    .avatar {
                        width: 44px;
                        height: 44px;
                        font-size: 17px;
                    }
                    .title {
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