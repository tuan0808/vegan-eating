// src/components/ReplyError.tsx
"use client";

import { useSearchParams } from "next/navigation";

// Reply failures from createReply land on the thread page as ?error=<reason>.
const ERR: Record<string, string> = {
    empty: "Please write something before replying.",
    cooldown: "You're replying a little fast — give it a minute.",
    hourly: "You've hit the hourly posting limit. Try again later.",
    blocked: "Unable to post from this connection.",
    banned: "Your account is not able to post.",
    unverified: "Please verify your email before replying — check your inbox for the link, or resend it from your dashboard.",
    too_fast: "That was quick — take a moment and try again.",
    links: "New accounts can’t post links yet — that unlocks once your account is established.",
    duplicate: "That looks almost identical to your last post.",
};

export default function ReplyError() {
    const params = useSearchParams();

    // Held-for-review is good news, not an error — show it differently.
    if (params.get("pending")) {
        return (
            <>
                <p className="reply-notice" role="status">
                    Thanks — your reply is awaiting moderator review and will appear once approved.
                </p>
                <style jsx>{`
                    .reply-notice {
                        background: #eef2e6;
                        border: 1px solid #cfd9bc;
                        color: #41502a;
                        border-radius: 10px;
                        padding: 10px 14px;
                        font-size: 14px;
                        margin: 22px 0 0;
                    }
                `}</style>
            </>
        );
    }

    const code = params.get("error");
    if (!code) return null;
    const msg = ERR[code] ?? "Something went wrong. Please try again.";

    return (
        <>
            <p className="reply-error" role="alert">{msg}</p>
            <style jsx>{`
                .reply-error {
                    background: #fbeae5;
                    border: 1px solid #e7c3b6;
                    color: #8a3b22;
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 14px;
                    margin: 22px 0 0;
                }
            `}</style>
        </>
    );
}