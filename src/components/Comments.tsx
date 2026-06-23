// src/components/Comments.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import CommentForm from './CommentForm'
import CommentItem from './CommentItem'
import type { CommentTarget, CommentNode } from '@/lib/comments'
import './Comments.css'

interface CommentsProps {
    target: CommentTarget
    path: string
    page?: number // fallback only; a ?cpage deep link in the URL wins
}

type Payload = {
    comments: CommentNode[]
    total: number
    totalPages: number
    page: number
    rating: { average: number; count: number }
    canComment: boolean
}

function buildQuery(target: CommentTarget, page: number): string {
    const p = new URLSearchParams()
    if ('recipeId' in target) p.set('recipeId', String(target.recipeId))
    else if ('articleId' in target) p.set('articleId', String(target.articleId))
    p.set('page', String(page))
    return p.toString()
}

export default function Comments({ target, path, page }: CommentsProps) {
    const [current, setCurrent] = useState(1)
    const [ready, setReady] = useState(false)
    const [data, setData] = useState<Payload | null>(null)
    const [loading, setLoading] = useState(true)
    const sectionRef = useRef<HTMLElement>(null)
    const didMount = useRef(false)

    // Read the deep-link page from the URL on mount (no useSearchParams, so the
    // host page can stay statically rendered without a Suspense boundary).
    useEffect(() => {
        const sp = new URLSearchParams(window.location.search)
        setCurrent(Math.max(1, Number(sp.get('cpage')) || page || 1))
        setReady(true)
    }, [page])

    const load = useCallback(
        async (p: number) => {
            setLoading(true)
            try {
                const res = await fetch(`/api/comments?${buildQuery(target, p)}`, { cache: 'no-store' })
                if (res.ok) setData(await res.json())
            } catch {
                /* keep whatever we last had */
            } finally {
                setLoading(false)
            }
        },
        [target],
    )

    useEffect(() => {
        if (ready) load(current)
    }, [ready, current, load])

    // Reflect the page in the URL for shareable links. Pure history update —
    // no Next navigation, since the static route ignores ?cpage anyway.
    useEffect(() => {
        if (!ready) return
        const url = current > 1 ? `${path}?cpage=${current}#comments` : `${path}#comments`
        window.history.replaceState(null, '', url)
    }, [ready, current, path])

    // Jump back to the section header when the page changes (not on first load).
    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true
            return
        }
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [current])

    const goTo = (p: number) => setCurrent(Math.max(1, p))
    const refresh = () => load(current)

    const ratable = 'recipeId' in target || 'articleId' in target
    const loginHref = `/login?callbackUrl=${encodeURIComponent(`${path}#comments`)}`

    const comments = data?.comments ?? []
    const total = data?.total ?? 0
    const totalPages = data?.totalPages ?? 1
    const canComment = data?.canComment ?? false
    const rating = data?.rating ?? { average: 0, count: 0 }
    const rounded = Math.round(rating.average)

    return (
        <section id="comments" className="comments" ref={sectionRef}>
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

            {/* Auth resolves client-side; render the right control once loaded. */}
            {data &&
                (canComment ? (
                    <CommentForm target={target} path={path} withRating={ratable} onPosted={refresh} />
                ) : (
                    <div className="signin">
                        <p>Join the conversation — sign in to leave a comment.</p>
                        <a className="signin-btn" href={loginHref}>Sign in to comment</a>
                    </div>
                ))}

            {loading && !data ? (
                <p className="empty">Loading comments…</p>
            ) : comments.length > 0 ? (
                <ul className="list">
                    {comments.map((c) => (
                        <CommentItem key={c.id} comment={c} target={target} path={path} canComment={canComment} />
                    ))}
                </ul>
            ) : (
                <p className="empty">{canComment ? 'Be the first to weigh in.' : 'No comments yet.'}</p>
            )}

            {totalPages > 1 && (
                <nav className="pager">
                    {current > 1 ? (
                        <a
                            href={`${path}?cpage=${current - 1}#comments`}
                            onClick={(e) => {
                                e.preventDefault()
                                goTo(current - 1)
                            }}
                        >
                            ← Newer
                        </a>
                    ) : (
                        <span className="off">← Newer</span>
                    )}
                    <span className="count">{current} / {totalPages}</span>
                    {current < totalPages ? (
                        <a
                            href={`${path}?cpage=${current + 1}#comments`}
                            onClick={(e) => {
                                e.preventDefault()
                                goTo(current + 1)
                            }}
                        >
                            Older →
                        </a>
                    ) : (
                        <span className="off">Older →</span>
                    )}
                </nav>
            )}
        </section>
    )
}