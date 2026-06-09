// src/components/ThreadView.tsx
"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { ThreadView as ThreadViewType } from "@/lib/forum";
import RichEditor from "@/components/RichEditor";

type Action = (formData: FormData) => Promise<void>;

// Submit button that shows a pending state while the save is in flight.
// useFormStatus must live inside the <form>, so it's its own component.
function SaveButton({ accent }: { accent: string }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="save-btn" style={{ background: accent }} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
        </button>
    );
}

const Icon = {
    edit: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden>
            <path d="M11 2.5l2.5 2.5L6 12.5 3 13l.5-3 7.5-7.5z" />
        </svg>
    ),
    trash: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden>
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5" />
        </svg>
    ),
    pin: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden>
            <path d="M8 10.5V14M5 2h6l-1 2 1.5 1.5L11 9H5l-.5-3.5L6 4 5 2z" />
        </svg>
    ),
    lock: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden>
            <rect x="3.5" y="7" width="9" height="6.5" rx="1.4" />
            <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
        </svg>
    ),
};

export default function ThreadView({
                                       view,
                                       loggedIn,
                                       currentUserId,
                                       canModerate,
                                       replyAction,
                                       editAction,
                                       deleteAction,
                                       pinAction,
                                       lockAction,
                                       categorySlug,
                                       forumSlug,
                                       threadSlug,
                                   }: {
    view: ThreadViewType;
    loggedIn: boolean;
    currentUserId: string | null;
    canModerate: boolean;
    replyAction: Action;
    editAction: Action;
    deleteAction: Action;
    pinAction: Action;
    lockAction: Action;
    categorySlug: string;
    forumSlug: string;
    threadSlug: string;
}) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const router = useRouter();

    const slugFields = (
        <>
            <input type="hidden" name="categorySlug" value={categorySlug} />
            <input type="hidden" name="forumSlug" value={forumSlug} />
            <input type="hidden" name="threadSlug" value={threadSlug} />
        </>
    );

    return (
        <div className="thread-view">
            <div className="posts">
                {view.posts.map((p) => {
                    const mine = !!currentUserId && p.authorId === currentUserId;
                    const canEdit = canModerate || mine;
                    const editing = editingId === p.id;

                    return (
                        <article key={p.id} className="post">
                            <div className="post-head">
                <span className="avatar" style={{ background: view.accent }} aria-hidden>
                  {p.authorInitial}
                </span>
                                <div className="who">
                                    <span className="name">{p.author}</span>
                                    <span className="when">
                    {p.isOriginal ? "started the thread" : "replied"} · {p.date}
                  </span>
                                </div>
                                {p.isOriginal ? (
                                    <span className="op" style={{ color: view.accent, borderColor: view.accent }}>
                    Original poster
                  </span>
                                ) : null}
                            </div>

                            {editing ? (
                                <form
                                    action={async (formData) => {
                                        await editAction(formData);
                                        setEditingId(null);
                                        router.refresh();
                                    }}
                                    className="edit-form"
                                >
                                    {slugFields}
                                    <input type="hidden" name="postId" value={p.id} />
                                    <RichEditor name="body" defaultValue={p.body} placeholder="Edit your post…" />
                                    <div className="edit-actions">
                                        <SaveButton accent={view.accent} />
                                        <button type="button" className="cancel-btn" onClick={() => setEditingId(null)}>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    {/* body is sanitised server-side before storage, so rendering it is safe */}
                                    <div className="body" dangerouslySetInnerHTML={{ __html: p.body }} />

                                    {canEdit || (canModerate && p.isOriginal) ? (
                                        <div className="post-tools">
                                            {canEdit ? (
                                                <button type="button" className="tool" onClick={() => setEditingId(p.id)}>
                                                    {Icon.edit} Edit
                                                </button>
                                            ) : null}

                                            {canModerate && p.isOriginal ? (
                                                <>
                                                    <form action={pinAction} className="tool-form">
                                                        {slugFields}
                                                        <button type="submit" className="tool">
                                                            {Icon.pin} {view.pinned ? "Unpin" : "Pin"}
                                                        </button>
                                                    </form>
                                                    <form action={lockAction} className="tool-form">
                                                        {slugFields}
                                                        <button type="submit" className="tool">
                                                            {Icon.lock} {view.locked ? "Reopen" : "Close"}
                                                        </button>
                                                    </form>
                                                </>
                                            ) : null}

                                            {canEdit ? (
                                                <form
                                                    action={deleteAction}
                                                    className="tool-form"
                                                    onSubmit={(e) => {
                                                        const msg = p.isOriginal
                                                            ? "Delete this entire thread? This can't be undone."
                                                            : "Delete this reply? This can't be undone.";
                                                        if (!window.confirm(msg)) e.preventDefault();
                                                    }}
                                                >
                                                    {slugFields}
                                                    <input type="hidden" name="postId" value={p.id} />
                                                    <button type="submit" className="tool danger">
                                                        {Icon.trash} Delete
                                                    </button>
                                                </form>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </article>
                    );
                })}
            </div>

            {view.locked ? (
                <div className="reply-stub">
                    <p>This thread is locked. No new replies can be added.</p>
                </div>
            ) : loggedIn ? (
                <form className="reply-box" action={replyAction}>
                    {slugFields}
                    <div className="hp" aria-hidden>
                        <label>
                            Website
                            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                        </label>
                    </div>
                    <label className="reply-label">Leave a reply</label>
                    <RichEditor name="body" placeholder="Write your reply…" />
                    <div className="reply-actions">
                        <button type="submit" className="reply-btn" style={{ background: view.accent }}>
                            Add reply
                        </button>
                    </div>
                </form>
            ) : (
                <div className="reply-stub">
                    <p>
                        <strong>Want to reply?</strong> <a href="/login">Log in</a> or{" "}
                        <a href="/register">create an account</a> to join the conversation.
                    </p>
                </div>
            )}

            <style jsx>{`
        .thread-view {
          max-width: var(--maxw);
          margin: 0 auto;
          padding: 8px 28px 90px;
        }
        .posts {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .post {
          background: #faf8f1;
          border: 1px solid var(--line, #e6e3da);
          border-radius: 16px;
          padding: 22px 24px;
        }
        .post-head {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
        }
        .avatar {
          flex-shrink: 0;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-family: var(--display, "Fraunces", serif);
          font-size: 17px;
          font-weight: 600;
          line-height: 1;
        }
        .who {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .name {
          font-weight: 600;
          font-size: 15.5px;
          color: var(--ink, #1c2317);
        }
        .when {
          font-size: 12.5px;
          color: var(--muted, #6b7264);
        }
        .op {
          flex-shrink: 0;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: 1px solid;
          border-radius: 999px;
          padding: 3px 10px;
        }

        .body {
          font-size: 15.5px;
          line-height: 1.7;
          color: var(--ink, #2a2f24);
        }
        .body :global(p) {
          margin: 0 0 0.7em;
        }
        .body :global(p:last-child) {
          margin-bottom: 0;
        }
        .body :global(h2) {
          font-family: var(--display, "Fraunces", serif);
          font-size: 22px;
          margin: 0.5em 0 0.3em;
        }
        .body :global(h3) {
          font-family: var(--display, "Fraunces", serif);
          font-size: 18px;
          margin: 0.5em 0 0.3em;
        }
        .body :global(ul),
        .body :global(ol) {
          padding-left: 1.4em;
          margin: 0 0 0.7em;
        }
        .body :global(blockquote) {
          border-left: 3px solid var(--terra, #c2603a);
          margin: 0 0 0.7em;
          padding: 2px 0 2px 14px;
          color: var(--muted, #555);
        }
        .body :global(pre) {
          background: #2a2f24;
          color: #f4f1e8;
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13.5px;
          overflow-x: auto;
        }
        .body :global(a) {
          color: var(--terra, #c2603a);
          text-decoration: underline;
        }

        /* ---- per-post tools ---- */
        .post-tools {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px 6px;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--line, #ece9de);
        }
        .tool-form {
          display: inline;
          margin: 0;
        }
        .tool {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          padding: 5px 9px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted, #6b7264);
          cursor: pointer;
          transition: background 0.13s ease, color 0.13s ease;
          font-family: inherit;
        }
        .tool:hover {
          background: rgba(0, 0, 0, 0.05);
          color: var(--terra, #c2603a);
        }
        .tool.danger:hover {
          color: #b23b1e;
        }

        /* ---- inline edit ---- */
        .edit-form {
          margin-top: 4px;
        }
        .edit-actions {
          margin-top: 12px;
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .save-btn {
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 10px 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .cancel-btn {
          background: transparent;
          border: none;
          color: var(--muted, #6b7264);
          font-size: 14px;
          cursor: pointer;
          font-family: inherit;
        }
        .cancel-btn:hover {
          color: var(--ink, #1c2317);
        }

        /* ---- reply ---- */
        .reply-box {
          margin-top: 26px;
        }
        .reply-label {
          display: block;
          font-family: var(--display, "Fraunces", serif);
          font-size: 22px;
          color: var(--ink, #1c2317);
          margin-bottom: 12px;
        }
        .reply-actions {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
        }
        .reply-btn {
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 11px 24px;
          font-size: 14.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .hp {
          position: absolute;
          left: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
        .reply-stub {
          margin-top: 22px;
          text-align: center;
          border: 1px dashed var(--line, #ddd9cd);
          border-radius: 16px;
          padding: 26px 20px;
          color: var(--muted, #6b7264);
          font-size: 14.5px;
        }
        .reply-stub strong {
          color: var(--ink, #1c2317);
        }
        .reply-stub a {
          color: var(--terra, #c2603a);
          font-weight: 600;
        }
        @media (max-width: 720px) {
          .post {
            padding: 18px 16px;
          }
        }
      `}</style>
        </div>
    );
}