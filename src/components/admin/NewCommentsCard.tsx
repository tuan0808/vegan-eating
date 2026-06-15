// src/components/admin/NewCommentsCard.tsx
// Drop this into your dashboard home (e.g. a quick-action card grid):
//   import NewCommentsCard from '@/components/admin/NewCommentsCard'
//   <NewCommentsCard />
import Link from 'next/link'
import { getNewCommentCount } from '@/lib/comments-admin'

export default async function NewCommentsCard() {
    const count = await getNewCommentCount()

    return (
        <Link href="/admin/comments" className="ncc-card">
            <span className="ncc-kicker">Moderation</span>
            <span className="ncc-count">{count}</span>
            <span className="ncc-label">{count === 1 ? 'new comment' : 'new comments'}</span>

            <style>{`
        .ncc-card {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          padding: 1.1rem 1.25rem;
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: 14px;
          text-decoration: none;
          transition: border-color 0.12s ease;
        }
        .ncc-card:hover { border-color: var(--green); }
        .ncc-kicker {
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--green);
          font-weight: 700;
        }
        .ncc-count {
          font-family: var(--display, "Fraunces", Georgia, serif);
          font-size: 2.4rem;
          line-height: 1;
          font-weight: 700;
          color: var(--ink);
        }
        .ncc-label { color: var(--muted); font-size: 0.85rem; }
      `}</style>
        </Link>
    )
}