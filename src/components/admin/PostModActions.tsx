// src/components/admin/PostModActions.tsx
"use client";

import { approvePost, rejectPost } from "@/app/actions/post-moderation";

export default function PostModActions({ postId }: { postId: string }) {
    return (
        <div className="pp-actions">
            <form action={approvePost}>
                <input type="hidden" name="postId" value={postId} />
                <button type="submit" className="pp-btn approve">Approve</button>
            </form>
            <form
                action={rejectPost}
                onSubmit={(e) => {
                    if (!window.confirm("Reject and delete this reply? This can't be undone.")) {
                        e.preventDefault();
                    }
                }}
            >
                <input type="hidden" name="postId" value={postId} />
                <button type="submit" className="pp-btn reject">Reject</button>
            </form>
        </div>
    );
}