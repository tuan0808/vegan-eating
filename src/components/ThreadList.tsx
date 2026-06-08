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
                                className="thread-row"
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
                }
                .thread-row {
                    display: block;
                    text-decoration: none;
                    color: inherit;
                    border-radius: 14px;
                    transition: background 0.16s ease;
                }
                .thread-row:hover {
                    background: rgba(0, 0, 0, 0.025);
                }
                .row-inner {
                    display: flex;
                    align-items: flex-start;
                    gap: 20px;
                    padding: 24px 16px;
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
                    align-items: flex-end;
                    gap: 1px;
                    white-space: nowrap;
                    min-width: 64px;
                }
                .count b {
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 32px;
                    font-weight: 700;
                    color: var(--ink, #1c2317);
                    line-height: 1;
                }
                .count span {
                    font-size: 12.5px;
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
    );
}