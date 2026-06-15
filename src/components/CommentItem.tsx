// src/components/CommentItem.tsx
'use client'

import { useState } from 'react'
import CommentForm from './CommentForm'
import type { CommentNode, CommentTarget } from '@/lib/comments'
import type { Comment } from '@prisma/client'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmt(date: Date | string): string {
    const d = new Date(date)
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function Bubble({ comment }: { comment: Comment }) {
    return (
        <div className="bubble">
            <div className="meta">
                <span className="who">{comment.authorName}</span>
                <span className="when">{fmt(comment.createdAt)}</span>
            </div>
            <p className="body">{comment.body}</p>

            <style jsx>{`
                .bubble {
                    background: var(--card);
                    border: 1px solid var(--line);
                    border-radius: 12px;
                    padding: 0.9rem 1.1rem;
                }
                .meta {
                    display: flex;
                    align-items: baseline;
                    gap: 0.7rem;
                    margin-bottom: 0.35rem;
                }
                .who { font-weight: 600; color: var(--ink); font-size: 0.95rem; }
                .when { color: var(--muted); font-size: 0.8rem; }
                .body { margin: 0; color: var(--ink); line-height: 1.6; white-space: pre-wrap; }
            `}</style>
        </div>
    )
}

interface CommentItemProps {
    comment: CommentNode
    target: CommentTarget
    path: string
    canComment: boolean
}

export default function CommentItem({ comment, target, path, canComment }: CommentItemProps) {
    const [replying, setReplying] = useState(false)

    return (
        <li className="item">
            <Bubble comment={comment} />

            {canComment && (
                <button className="replybtn" onClick={() => setReplying((v) => !v)}>
                    {replying ? 'Cancel' : 'Reply'}
                </button>
            )}

            {canComment && replying && (
                <CommentForm
                    target={target}
                    path={path}
                    parentId={comment.id}
                    compact
                    onPosted={() => setReplying(false)}
                />
            )}

            {comment.replies.length > 0 && (
                <ul className="replies">
                    {comment.replies.map((r) => (
                        <li key={r.id}>
                            <Bubble comment={r} />
                        </li>
                    ))}
                </ul>
            )}

            <style jsx>{`
                .item { list-style: none; margin-bottom: 1.5rem; }
                .replybtn {
                    background: none;
                    border: none;
                    color: var(--green);
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 0.35rem 0 0;
                }
                .replies {
                    margin: 0.75rem 0 0;
                    padding: 0 0 0 1.25rem;
                    border-left: 2px solid var(--line);
                    list-style: none;
                }
                .replies li { margin-top: 0.75rem; }
            `}</style>
        </li>
    )
}