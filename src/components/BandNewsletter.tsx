// src/components/BandNewsletter.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Text is admin-editable (Site settings → Newsletter videos); the defaults here
// mirror BAND_DEFAULTS for when nothing is configured yet.
const DEFAULT_PLACEHOLDER = "Subscribe. Drop your email";
const DEFAULT_BUTTON = "Subscribe";

// Subscribing now means signing up: the email is carried to the account form
// (prefilled there), and creating the account auto-joins the newsletter. No
// email-only list signup happens here anymore.
export default function BandNewsletter({
    placeholder = DEFAULT_PLACEHOLDER,
    button = DEFAULT_BUTTON,
}: {
    placeholder?: string;
    button?: string;
}) {
    const router = useRouter();
    const [email, setEmail] = useState("");

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        router.push(value ? `/register?email=${encodeURIComponent(value)}` : "/register");
    };

    return (
        <form className="news-form" onSubmit={submit}>
            <input
                type="email"
                name="email"
                placeholder={placeholder}
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <button type="submit">{button}</button>
        </form>
    );
}
