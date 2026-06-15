// src/components/Comments.tsx
import { getComments, type CommentTarget } from '@/lib/comments'
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
    const [{ comments, total, totalPages, page: current }, session] = await Promise.all([
        getComments(target, page),
        auth(),
    ])
    const canComment = !!session?.user?.id
    const loginHref = `/login?callbackUrl=${encodeURIComponent(`${path}#comments`)}`

    return (
        <section id="comments" className="comments">
            <h2 className="title">
                {total === 0 ? 'Comments' : `${total} comment${total === 1 ? '' : 's'}`}
            </h2>

            {canComment ? (
                <CommentForm target={target} path={path} />
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