// src/components/CommentForm.tsx
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createComment } from '@/app/actions/comments'
import type { CommentTarget, CommentFormState } from '@/lib/comments'

const initialState: CommentFormState = { error: null, success: false }

// Lives in its own component so useFormStatus can read the form's pending state.
// Because of that, styled-jsx scopes to THIS component — so the button's styles
// must live here, not in the parent's <style jsx> (they wouldn't reach it).
function SubmitButton({ compact }: { compact: boolean }) {
    const { pending } = useFormStatus()
    return (
        <>
            <button type="submit" className="submit" disabled={pending}>
                {pending ? 'Posting…' : compact ? 'Reply' : 'Post comment'}
            </button>
            <style jsx>{`
                .submit {
                    align-self: flex-start;
                    background: var(--green);
                    color: var(--paper);
                    border: none;
                    border-radius: 999px;
                    padding: 0.5rem 1.3rem;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.15s ease;
                }
                .submit:hover { opacity: 0.88; }
                .submit:disabled { opacity: 0.55; cursor: default; }
            `}</style>
        </>
    )
}

interface CommentFormProps {
    target: CommentTarget
    path: string
    parentId?: string | null
    onPosted?: () => void
    compact?: boolean
    withRating?: boolean
}

export default function CommentForm({
                                        target,
                                        path,
                                        parentId = null,
                                        onPosted,
                                        compact = false,
                                        withRating = false,
                                    }: CommentFormProps) {
    const [state, formAction] = useActionState(createComment, initialState)
    const formRef = useRef<HTMLFormElement>(null)
    const [score, setScore] = useState(0)
    const [hover, setHover] = useState(0)

    // Stars only make sense on a top-level comment for a ratable target (recipes).
    const showRating = withRating && !parentId

    useEffect(() => {
        if (state.success) {
            formRef.current?.reset()
            setScore(0)
            setHover(0)
            onPosted?.()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.key])

    return (
        <form ref={formRef} action={formAction} className={`cform ${compact ? 'compact' : ''}`}>
            {'recipeId' in target && <input type="hidden" name="recipeId" value={target.recipeId} />}
            {'articleId' in target && <input type="hidden" name="articleId" value={target.articleId} />}
            {parentId && <input type="hidden" name="parentId" value={parentId} />}
            <input type="hidden" name="path" value={path} />

            {showRating && (
                <div className="rate">
                    <span className="rate-label">Your rating</span>
                    <div className="stars" role="radiogroup" aria-label="Your rating">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={`star ${n <= (hover || score) ? 'on' : ''}`}
                                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                                aria-pressed={score === n}
                                onMouseEnter={() => setHover(n)}
                                onMouseLeave={() => setHover(0)}
                                onClick={() => setScore((s) => (s === n ? 0 : n))}
                            >
                                ★
                            </button>
                        ))}
                        <span className="rate-opt">optional</span>
                    </div>
                    <input type="hidden" name="rating" value={score || ''} />
                </div>
            )}

            {/* No name field — identity comes from the signed-in account, server-side. */}
            <textarea
                name="body"
                placeholder={compact ? 'Write a reply…' : 'Join the conversation…'}
                className="field body"
                rows={compact ? 2 : 3}
                maxLength={5000}
                required
            />

            {state.error && <p className="err">{state.error}</p>}

            <div className="actions">
                <SubmitButton compact={compact} />
            </div>

            <style jsx>{`
                .cform {
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                    margin-top: 1rem;
                }
                .cform.compact { margin-top: 0.75rem; }
                .field {
                    width: 100%;
                    border: 1px solid var(--line);
                    border-radius: 10px;
                    padding: 0.65rem 0.8rem;
                    color: var(--ink);
                    font-family: inherit;
                    font-size: 0.95rem;
                    transition: border-color 0.15s ease;
                }
                .field:focus {
                    outline: none;
                    border-color: var(--green);
                }
                .body { resize: vertical; line-height: 1.5; }
                .rate { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
                .rate-label { font-size: 0.9rem; font-weight: 600; color: var(--ink); }
                .stars { display: inline-flex; align-items: center; gap: 0.1rem; }
                .star {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0 0.05rem;
                    font-size: 1.45rem;
                    line-height: 1;
                    color: var(--line);
                    transition: color 0.12s ease, transform 0.12s ease;
                }
                .star:hover { transform: scale(1.1); }
                .star.on { color: #e0a23b; }
                .rate-opt { font-size: 0.78rem; color: var(--muted); margin-left: 0.4rem; }
                .err {
                    color: var(--terra);
                    font-size: 0.85rem;
                    margin: 0;
                }
                .actions { display: flex; }
            `}</style>
        </form>
    )
}