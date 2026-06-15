// src/components/admin/CommentModActions.tsx
'use client'

import { moderateComment } from '@/app/actions/comment-moderation'

interface Props {
    id: string
    status: string
    path: string // page to revalidate after the action
}

function OpForm({
                    id,
                    op,
                    path,
                    label,
                    className,
                    confirmText,
                }: {
    id: string
    op: string
    path: string
    label: string
    className: string
    confirmText?: string
}) {
    return (
        <form
            action={moderateComment}
            onSubmit={(e) => {
                if (confirmText && !window.confirm(confirmText)) e.preventDefault()
            }}
        >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="op" value={op} />
            <input type="hidden" name="path" value={path} />
            <button type="submit" className={`mod-btn ${className}`}>
                {label}
            </button>
        </form>
    )
}

export default function CommentModActions({ id, status, path }: Props) {
    return (
        <div className="mod-actions">
            {status === 'APPROVED' ? (
                <OpForm id={id} op="hide" path={path} label="Hide" className="hide" />
            ) : (
                <OpForm id={id} op="approve" path={path} label="Approve" className="approve" />
            )}
            <OpForm
                id={id}
                op="spam"
                path={path}
                label="Spam + block IP"
                className="spam"
                confirmText="Mark as spam and block this IP from posting?"
            />
            <OpForm
                id={id}
                op="delete"
                path={path}
                label="Delete"
                className="delete"
                confirmText="Permanently delete this comment? This cannot be undone."
            />
        </div>
    )
}