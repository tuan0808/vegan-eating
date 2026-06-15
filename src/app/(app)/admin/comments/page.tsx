// src/app/(app)/admin/comments/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentUser } from '@/lib/auth-helpers'
import {
    getCommentQueue,
    getContentWithComments,
    getNewCommentCount,
    fmtStamp,
} from '@/lib/comments-admin'
import CommentModActions from '@/components/admin/CommentModActions'
import ReviewBell from '@/components/admin/ReviewBell'
import './comments-admin.css'

const PATH = '/admin/comments'

export default async function AdminCommentsPage({
                                                    searchParams,
                                                }: {
    searchParams?: { tab?: string; page?: string }
}) {
    const user = await currentUser()
    if (!user || !(user.role === 'ADMIN' || user.role === 'MODERATOR')) redirect('/')

    const tab = searchParams?.tab === 'content' ? 'content' : 'recent'
    const page = Number(searchParams?.page) || 1

    const [newCount, queue, groups] = await Promise.all([
        getNewCommentCount(),
        tab === 'recent' ? getCommentQueue(page) : null,
        tab === 'content' ? getContentWithComments() : null,
    ])

    return (
        <div className="admin-comments">
            {/* div, never <header> — the global `header{position:fixed}` rule would
          teleport it to the viewport corner. */}
            <div className="ac-head">
                <div>
                    <p style={kicker}>Moderation</p>
                    <h1 style={h1}>Comments</h1>
                </div>
                <ReviewBell count={newCount} />
            </div>

            <nav className="ac-tabs">
                <Link href={`${PATH}?tab=recent`} className={tab === 'recent' ? 'on' : ''}>
                    Recent
                </Link>
                <Link href={`${PATH}?tab=content`} className={tab === 'content' ? 'on' : ''}>
                    By content
                </Link>
            </nav>

            {tab === 'recent' && queue && (
                <>
                    {queue.rows.length === 0 ? (
                        <p className="ac-empty">No comments yet.</p>
                    ) : (
                        <ul className="ac-list">
                            {queue.rows.map((c) => (
                                <li key={c.id} className="ac-card">
                                    <div className="ac-meta">
                                        <span className="ac-who">{c.authorName}</span>
                                        <span className={`ac-badge ${c.status.toLowerCase()}`}>{c.status}</span>
                                        {c.isReply && <span className="ac-reply">reply</span>}
                                        <span className="ac-when">{fmtStamp(c.createdAt)}</span>
                                    </div>
                                    <p className="ac-body">{c.body}</p>
                                    <div className="ac-foot">
                                        {c.target ? (
                                            <Link
                                                className="ac-target"
                                                href={`${PATH}/${c.target.type}/${c.target.id}`}
                                            >
                                                on {c.target.title}
                                            </Link>
                                        ) : (
                                            <span className="ac-target muted">orphaned</span>
                                        )}
                                        {c.ipAddress && <span className="ac-ip">{c.ipAddress}</span>}
                                    </div>
                                    <CommentModActions id={c.id} status={c.status} path={PATH} />
                                </li>
                            ))}
                        </ul>
                    )}

                    {queue.totalPages > 1 && (
                        <nav className="ac-pager">
                            {queue.page > 1 ? (
                                <Link href={`${PATH}?tab=recent&page=${queue.page - 1}`}>← Newer</Link>
                            ) : (
                                <span className="off">← Newer</span>
                            )}
                            <span className="count">
                {queue.page} / {queue.totalPages}
              </span>
                            {queue.page < queue.totalPages ? (
                                <Link href={`${PATH}?tab=recent&page=${queue.page + 1}`}>Older →</Link>
                            ) : (
                                <span className="off">Older →</span>
                            )}
                        </nav>
                    )}
                </>
            )}

            {tab === 'content' && groups && (
                <>
                    {groups.length === 0 ? (
                        <p className="ac-empty">No comments yet.</p>
                    ) : (
                        <ul className="ac-content">
                            {groups.map((g) => (
                                <li key={`${g.type}-${g.id}`}>
                                    <Link className="ac-content-row" href={`${PATH}/${g.type}/${g.id}`}>
                                        <span className="ac-content-title">{g.title}</span>
                                        <span className="ac-content-meta">
                      <span className="ac-type">{g.type}</span>
                      <span className="ac-count">{g.count}</span>
                                            {g.lastAt && <span className="ac-last">{fmtStamp(g.lastAt)}</span>}
                    </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    )
}
const kicker: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--terra, #c2603a)",
};
const h1: React.CSSProperties = {
    fontFamily: 'var(--display, "Fraunces", serif)',
    fontSize: 32,
    color: "var(--ink, #1c2317)",
    margin: "8px 0 0",
};