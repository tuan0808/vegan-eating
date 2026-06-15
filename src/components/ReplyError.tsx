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
};

export default function ReplyError() {
    const code = useSearchParams().get("error");
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