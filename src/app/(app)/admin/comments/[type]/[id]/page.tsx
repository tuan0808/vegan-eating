// src/app/(app)/admin/comments/[type]/[id]/page.tsx
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { currentUser } from '@/lib/auth-helpers'
import { getContentThread, fmtStamp } from '@/lib/comments-admin'
import CommentModActions from '@/components/admin/CommentModActions'
import '../../comments-admin.css'

export default async function ContentThreadPage({
                                                    params: paramsP,
                                                }: {
    params: Promise<{ type: string; id: string }>
}) {
    const params = await paramsP
    const user = await currentUser()
    if (!user || !(user.role === 'ADMIN' || user.role === 'MODERATOR')) redirect('/')

    const type = params.type === 'article' ? 'article' : params.type === 'recipe' ? 'recipe' : null
    if (!type) notFound()

    const rows = await getContentThread(type, params.id)
    const path = `/admin/comments/${type}/${params.id}`
    const title = rows[0]?.target?.title ?? `${type} ${params.id}`
    const publicHref =
        type === 'recipe' && rows[0]?.target ? `/recipes/${rows[0].target.slug}#comments` : null

    return (
        <div className="admin-comments">
            {/* div, never <header> — global header rule would teleport it. */}
            <div className="ac-head">
                <div>
                    <Link href="/admin/comments" className="ac-back">← All comments</Link>
                    <h1 className="ac-title">{title}</h1>
                    <span className="ac-subtitle">
            {rows.length} comment{rows.length === 1 ? '' : 's'}
                        {publicHref && (
                            <>
                                {' · '}
                                <a href={publicHref} target="_blank" rel="noopener">view on site</a>
                            </>
                        )}
          </span>
                </div>
            </div>

            {rows.length === 0 ? (
                <p className="ac-empty">No comments on this {type}.</p>
            ) : (
                <ul className="ac-list">
                    {rows.map((c) => (
                        <li key={c.id} className="ac-card">
                            <div className="ac-meta">
                                <span className="ac-who">{c.authorName}</span>
                                <span className={`ac-badge ${c.status.toLowerCase()}`}>{c.status}</span>
                                {c.isReply && <span className="ac-reply">reply</span>}
                                <span className="ac-when">{fmtStamp(c.createdAt)}</span>
                            </div>
                            <p className="ac-body">{c.body}</p>
                            {c.ipAddress && (
                                <div className="ac-foot">
                                    <span className="ac-ip">{c.ipAddress}</span>
                                </div>
                            )}
                            <CommentModActions id={c.id} status={c.status} path={path} />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}