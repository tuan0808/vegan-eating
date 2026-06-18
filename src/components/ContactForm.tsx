// src/components/ContactForm.tsx
"use client";

import { useState } from "react";
import { sendContactMessage } from "@/lib/actions/contact";
import { CONTACT_CATEGORIES } from "@/lib/contact-categories";

export default function ContactForm({ defaultName }: { defaultName: string }) {
    const [name, setName] = useState(defaultName);
    const [category, setCategory] = useState("GENERAL");
    const [message, setMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!message.trim()) {
            setError("Please write a message.");
            return;
        }

        const fd = new FormData();
        fd.set("name", name.trim());
        fd.set("category", category);
        fd.set("body", message.trim());

        setSubmitting(true);
        try {
            const res = await sendContactMessage(fd);
            if (!res.ok) {
                setError(res.error ?? "Something went wrong. Please try again.");
                return;
            }
            setDone(true);
        } catch {
            setError("Couldn't reach the server. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    if (done) {
        return (
            <div className="tool-box submit-done">
                <span className="kicker">Received</span>
                <h2>Thanks, {name || "friend"} — got it!</h2>
                <p>
                    Your message is in our queue. We&rsquo;ll see it in the dashboard and get back to
                    you soon.
                </p>
                <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                        setMessage("");
                        setDone(false);
                    }}
                >
                    Send another
                </button>
            </div>
        );
    }

    return (
        <form className="tool-box submit-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="submit-error" role="alert">{error}</div>}

            <label className="field">
                <span className="field-label">
                    Your name <em>required</em>
                </span>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    maxLength={80}
                    required
                />
            </label>

            <label className="field">
                <span className="field-label">
                    What&rsquo;s this about? <em>required</em>
                </span>
                <select
                    className="field-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                >
                    {CONTACT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
            </label>

            <label className="field">
                <span className="field-label">
                    Message <em>required</em>
                </span>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help?"
                    rows={6}
                    maxLength={4000}
                    required
                />
            </label>

            <button type="submit" className="btn-primary submit-btn" disabled={submitting}>
                {submitting ? "Sending…" : "Send message"}
            </button>
        </form>
    );
}