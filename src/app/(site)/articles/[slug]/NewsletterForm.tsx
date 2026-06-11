// src/app/articles/[slug]/NewsletterForm.tsx
"use client";

import { useState } from "react";

export default function NewsletterForm() {
    const [email, setEmail] = useState("");
    const [done, setDone] = useState(false);

    // No backend yet — confirms locally. Wire to a real provider when ready.
    const submit = () => { if (email.trim()) setDone(true); };

    return (
        <div className="art-news">
            <span className="art-news-kicker">The dispatch, in your inbox</span>
            <h4 className="art-news-title">New recipes &amp; notes, once a week</h4>
            <p className="art-news-dek">
                The good stuff from the kitchen and the forum — a short weekly email.
                No ads, no selling your address, unsubscribe in one click.
            </p>
            {done ? (
                <p className="art-news-thanks">Thanks — you&rsquo;re on the list. 🌱</p>
            ) : (
                <div className="art-news-form">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                        placeholder="you@example.com"
                        aria-label="Your email address"
                    />
                    <button type="button" onClick={submit}>Subscribe</button>
                </div>
            )}
        </div>
    );
}