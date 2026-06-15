// src/components/admin/ReviewBell.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { markAllReviewed } from '@/app/actions/comment-moderation'

export default function ReviewBell({ count }: { count: number }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    // Click-outside to close.
    useEffect(() => {
        if (!open) return
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [open])

    return (
        <div className="bell-wrap" ref={ref}>
            <button
                type="button"
                className={`bell ${count > 0 ? 'has-new' : ''}`}
                onClick={() => setOpen((o) => !o)}
                aria-label="Review notifications"
                aria-expanded={open}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
                {count > 0 && <span className="dot">{count > 99 ? '99+' : count}</span>}
            </button>

            {open && (
                <div className="menu" role="menu">
                    <p className="menu-title">
                        {count > 0 ? `${count} new comment${count === 1 ? '' : 's'}` : 'No new comments'}
                    </p>
                    <p className="menu-sub">
                        {count > 0 ? 'Posted since your last review.' : 'You’re all caught up.'}
                    </p>
                    {count > 0 && (
                        <form action={markAllReviewed}>
                            <button type="submit" className="menu-action" onClick={() => setOpen(false)}>
                                Mark all reviewed
                            </button>
                        </form>
                    )}
                </div>
            )}

            <style jsx>{`
        .bell-wrap {
          position: relative;
        }
        .bell {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: var(--paper);
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.12s ease, color 0.12s ease;
        }
        .bell:hover { border-color: var(--green); color: var(--green); }
        .bell.has-new { color: var(--green); }
        .dot {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          border-radius: 999px;
          background: var(--terra);
          color: #fff;
          font-size: 0.7rem;
          font-weight: 700;
          line-height: 19px;
          text-align: center;
        }
        .menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 50;
          width: 240px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 1rem;
          box-shadow: 0 14px 40px rgba(40, 35, 25, 0.14);
        }
        .menu::before {
          content: "";
          position: absolute;
          top: -6px;
          right: 14px;
          width: 11px;
          height: 11px;
          background: var(--paper);
          border-left: 1px solid var(--line);
          border-top: 1px solid var(--line);
          transform: rotate(45deg);
        }
        .menu-title {
          margin: 0 0 0.2rem;
          font-weight: 700;
          color: var(--ink);
          font-size: 0.95rem;
        }
        .menu-sub {
          margin: 0 0 0.85rem;
          color: var(--muted);
          font-size: 0.82rem;
          line-height: 1.4;
        }
        .menu form { margin: 0; }
        .menu-action {
          width: 100%;
          background: var(--green);
          color: var(--paper);
          border: none;
          border-radius: 999px;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.12s ease;
        }
        .menu-action:hover { opacity: 0.88; }
      `}</style>
        </div>
    )
}