// src/components/ThreadList.tsx
"use client";

import Link from "next/link";
import type { ThreadRow } from "@/lib/forum";

export default function ThreadList({
                                       threads,
                                       accent,
                                       categorySlug,
                                       forumSlug,
                                       newHref,
                                       notice,
                                   }: {
    threads: ThreadRow[];
    accent: string;
    categorySlug: string;
    forumSlug: string;
    /** Where "New thread" goes — the composer when signed in, /login otherwise; null hides it. */
    newHref: string | null;
    /** Why this user can't start a thread here (staff-only board, intro gate). */
    notice?: { text: string; href?: string; linkLabel?: string } | null;
}) {
    return (
        <div className="thread-wrap">
            <div className="toolbar">
                <span className="toolbar-count">
                    {threads.length} {threads.length === 1 ? "thread" : "threads"}
                </span>
                {newHref ? <Link href={newHref} className="new-btn">+ New thread</Link> : null}
            </div>

            {notice ? (
                <p className="notice">
                    {notice.text}
                    {notice.href ? (
                        <>
                            {" "}
                            <Link href={notice.href}>{notice.linkLabel ?? "Go"} →</Link>
                        </>
                    ) : null}
                </p>
            ) : null}

            {threads.length === 0 ? (
                <div className="empty">
                    <p className="empty-title">No threads here yet.</p>
                    <p className="empty-sub">Be the first to start a conversation in this board.</p>
                    {newHref ? (
                        <Link href={newHref} className="new-btn" style={{ marginTop: 18 }}>+ Start a thread</Link>
                    ) : null}
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
                .toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 16px 16px 8px;
                }
                .toolbar-count {
                    font-size: 13px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--muted, #6b7264);
                }
                .thread-wrap :global(.new-btn) {
                    display: inline-block;
                    background: var(--terra, #c2603a);
                    color: #fff;
                    border-radius: 11px;
                    padding: 10px 20px;
                    font-size: 14px;
                    font-weight: 600;
                    text-decoration: none;
                }
                .thread-wrap :global(.new-btn:hover) {
                    filter: brightness(0.96);
                }
                .notice {
                    margin: 4px 16px 12px;
                    background: #f3efe2;
                    border: 1px solid var(--line, #e6e3da);
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 14px;
                    color: var(--ink, #1c2317);
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
                }
                /* hover/lift + green title live in globals.css (.thread-row), so a
                   scoped :hover here can't out-specify and override them. */
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