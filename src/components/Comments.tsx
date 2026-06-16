// src/components/Comments.tsx
import { getComments, getRatingSummary, type CommentTarget } from '@/lib/comments'
import { auth } from '@/auth'
import CommentForm from './CommentForm'
import CommentItem from './CommentItem'
import './Comments.css'

interface CommentsProps {
    target: CommentTarget
    path: string
    page?: number
}

export default async function Comments({ target, path, page = 1 }: CommentsProps) {
    const [{ comments, total, totalPages, page: current }, session, rating] = await Promise.all([
        getComments(target, page),
        auth(),
        getRatingSummary(target),
    ])
    const canComment = !!session?.user?.id
    const ratable = 'recipeId' in target || 'articleId' in target
    const loginHref = `/login?callbackUrl=${encodeURIComponent(`${path}#comments`)}`
    const rounded = Math.round(rating.average)

    return (
        <section id="comments" className="comments">
            <h2 className="title">
                {ratable ? 'Reviews & comments' : total === 0 ? 'Comments' : `${total} comment${total === 1 ? '' : 's'}`}
            </h2>

            {ratable && (
                <div style={{ margin: '-2px 0 16px', fontSize: '0.95rem', color: 'var(--muted)' }}>
                    {rating.count > 0 ? (
                        <span>
                            <span style={{ color: '#e0a23b', letterSpacing: '1px' }} aria-hidden="true">
                                {'★'.repeat(rounded)}
                                <span style={{ color: 'var(--line)' }}>{'★'.repeat(5 - rounded)}</span>
                            </span>{' '}
                            <b style={{ color: 'var(--ink)' }}>{rating.average.toFixed(1)}</b> · {rating.count} rating
                            {rating.count === 1 ? '' : 's'}
                        </span>
                    ) : (
                        'No ratings yet — be the first.'
                    )}
                </div>
            )}

            {canComment ? (
                <CommentForm target={target} path={path} withRating={ratable} />
            ) : (
                <div className="signin">
                    <p>Join the conversation — sign in to leave a comment.</p>
                    <a className="signin-btn" href={loginHref}>Sign in to comment</a>
                </div>
            )}

            {comments.length > 0 ? (
                <ul className="list">
                    {comments.map((c) => (
                        <CommentItem
                            key={c.id}
                            comment={c}
                            target={target}
                            path={path}
                            canComment={canComment}
                        />
                    ))}
                </ul>
            ) : (
                <p className="empty">{canComment ? 'Be the first to weigh in.' : 'No comments yet.'}</p>
            )}

            {totalPages > 1 && (
                <nav className="pager">
                    {current > 1 ? (
                        <a href={`${path}?cpage=${current - 1}#comments`}>← Newer</a>
                    ) : (
                        <span className="off">← Newer</span>
                    )}
                    <span className="count">{current} / {totalPages}</span>
                    {current < totalPages ? (
                        <a href={`${path}?cpage=${current + 1}#comments`}>Older →</a>
                    ) : (
                        <span className="off">Older →</span>
                    )}
                </nav>
            )}
        </section>
    )
}