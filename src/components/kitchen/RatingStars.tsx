// src/components/kitchen/RatingStars.tsx
"use client";

import { useState, useTransition } from "react";
import { saveRating } from "@/lib/actions/kitchen";

export default function RatingStars({
                                        recipeId,
                                        initialScore = 0,
                                        initialReview = "",
                                        average = 0,
                                        count = 0,
                                    }: {
    recipeId: string;
    initialScore?: number;
    initialReview?: string;
    average?: number;
    count?: number;
}) {
    const [score, setScore] = useState(initialScore);
    const [hover, setHover] = useState(0);
    const [review, setReview] = useState(initialReview);
    const [saved, setSaved] = useState(false);
    const [pending, start] = useTransition();

    const shown = hover || score;

    function pick(n: number) {
        setScore(n);
        setSaved(false);
    }

    function submit() {
        if (!score) return;
        start(async () => {
            await saveRating(recipeId, score, review);
            setSaved(true);
        });
    }

    return (
        <div className="rs">
            <div className="rs-summary">
                {count > 0 ? (
                    <>
                        <strong>{average.toFixed(1)}</strong> · {count} rating{count === 1 ? "" : "s"}
                    </>
                ) : (
                    <span className="rs-muted">No ratings yet — be the first.</span>
                )}
            </div>

            <div className="rs-stars" role="radiogroup" aria-label="Your rating">
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        className={`rs-star${n <= shown ? " on" : ""}`}
                        role="radio"
                        aria-checked={score === n}
                        aria-label={`${n} star${n === 1 ? "" : "s"}`}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => pick(n)}
                    >
                        ★
                    </button>
                ))}
                {score > 0 && <span className="rs-your">Your rating</span>}
            </div>

            <textarea
                className="rs-review"
                placeholder="Add a review (optional) — how did it turn out?"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                maxLength={2000}
            />

            <div className="rs-actions">
                <button type="button" className="rs-save" onClick={submit} disabled={!score || pending}>
                    {pending ? "Saving…" : saved ? "Saved ✓" : "Submit"}
                </button>
            </div>
        </div>
    );
}