// src/components/SubmitRecipeForm.tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitRecipe } from "@/app/submit/actions";

// Keep these in sync with the same constants in src/app/submit/actions.ts
const MAX_IMAGES = 10;
const MAX_IMAGE_MB = 5;

type Preview = { file: File; url: string };

export default function SubmitRecipeForm({ authorName }: { authorName: string }) {
    const router = useRouter();

    const [title, setTitle] = useState("");
    const [dietType, setDietType] = useState("");
    const [ingredients, setIngredients] = useState("");
    const [method, setMethod] = useState("");
    const [prepMin, setPrepMin] = useState("");
    const [cookMin, setCookMin] = useState("");
    const [readyMin, setReadyMin] = useState("");
    const [images, setImages] = useState<Preview[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    function addFiles(list: FileList | null) {
        if (!list) return;
        setError(null);
        const next = [...images];
        for (const file of Array.from(list)) {
            if (!file.type.startsWith("image/")) {
                setError("Only image files are allowed.");
                continue;
            }
            if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
                setError(`"${file.name}" is over ${MAX_IMAGE_MB} MB and was skipped.`);
                continue;
            }
            if (next.length >= MAX_IMAGES) {
                setError(`You can add up to ${MAX_IMAGES} images.`);
                break;
            }
            next.push({ file, url: URL.createObjectURL(file) });
        }
        setImages(next);
        if (fileRef.current) fileRef.current.value = "";
    }

    function removeImage(i: number) {
        setImages((prev) => {
            URL.revokeObjectURL(prev[i].url);
            return prev.filter((_, idx) => idx !== i);
        });
    }

    function resetForm() {
        images.forEach((p) => URL.revokeObjectURL(p.url));
        setTitle("");
        setDietType("");
        setIngredients("");
        setMethod("");
        setPrepMin("");
        setCookMin("");
        setReadyMin("");
        setImages([]);
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!title.trim() || !ingredients.trim() || !method.trim()) {
            setError("Title, ingredients and method are all required.");
            return;
        }
        if (dietType !== "VEGAN" && dietType !== "VEGETARIAN") {
            setError("Please choose vegan or vegetarian.");
            return;
        }

        const fd = new FormData();
        fd.set("title", title.trim());
        fd.set("dietType", dietType);
        fd.set("ingredients", ingredients.trim());
        fd.set("method", method.trim());
        if (prepMin) fd.set("prepMin", prepMin);
        if (cookMin) fd.set("cookMin", cookMin);
        if (readyMin) fd.set("readyMin", readyMin);
        images.forEach(({ file }) => fd.append("images", file));

        setSubmitting(true);
        try {
            const res = await submitRecipe(fd);
            if (!res.ok) {
                setError(res.error ?? "Something went wrong. Please try again.");
                return;
            }
            setDone(true);
            router.refresh();
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
                <h2>Thanks, {authorName} — got it!</h2>
                <p>
                    Your recipe is in the review queue. We test the promising ones and publish the keepers
                    with credit to you.
                </p>
                <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                        resetForm();
                        setDone(false);
                    }}
                >
                    Submit another
                </button>
            </div>
        );
    }

    return (
        <form className="tool-box submit-form" onSubmit={handleSubmit} noValidate>
            {error && <div className="submit-error" role="alert">{error}</div>}

            <label className="field">
        <span className="field-label">
          Recipe title <em>required</em>
        </span>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Smoky tofu tacos"
                    required
                />
            </label>

            <label className="field">
        <span className="field-label">
          Diet <em>required</em>
        </span>
                <select
                    className="field-select"
                    value={dietType}
                    onChange={(e) => setDietType(e.target.value)}
                    required
                >
                    <option value="" disabled>
                        Choose one…
                    </option>
                    <option value="VEGAN">Vegan</option>
                    <option value="VEGETARIAN">Vegetarian</option>
                </select>
            </label>

            <label className="field">
        <span className="field-label">
          Ingredients <em>required</em>
        </span>
                <textarea
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder={"One per line, e.g.\n1 block firm tofu\n2 tbsp soy sauce"}
                    rows={6}
                    required
                />
            </label>

            <label className="field">
        <span className="field-label">
          Method <em>required</em>
        </span>
                <textarea
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    placeholder={"One step per line, e.g.\nPress the tofu…\nFry until golden…"}
                    rows={6}
                    required
                />
            </label>

            <fieldset className="time-grid">
                <legend className="field-label">Timing <em>optional</em></legend>
                <label className="field">
                    <span className="field-sub">Prep (min)</span>
                    <input type="number" min={0} inputMode="numeric" value={prepMin}
                           onChange={(e) => setPrepMin(e.target.value)} placeholder="15" />
                </label>
                <label className="field">
                    <span className="field-sub">Cook (min)</span>
                    <input type="number" min={0} inputMode="numeric" value={cookMin}
                           onChange={(e) => setCookMin(e.target.value)} placeholder="20" />
                </label>
                <label className="field">
                    <span className="field-sub">Ready in (min)</span>
                    <input type="number" min={0} inputMode="numeric" value={readyMin}
                           onChange={(e) => setReadyMin(e.target.value)} placeholder="35" />
                </label>
            </fieldset>

            <div className="field">
        <span className="field-label">
          Photos <em>optional · up to {MAX_IMAGES}, {MAX_IMAGE_MB} MB each</em>
        </span>

                <div className="dropzone" onClick={() => fileRef.current?.click()}>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => addFiles(e.target.files)}
                    />
                    <span className="dropzone-text">
            Click to add photos
            <small>{images.length}/{MAX_IMAGES} added</small>
          </span>
                </div>

                {images.length > 0 && (
                    <div className="thumbs">
                        {images.map((img, i) => (
                            <div className="thumb" key={img.url}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.url} alt={`Upload ${i + 1}`} />
                                <button
                                    type="button"
                                    className="thumb-remove"
                                    aria-label="Remove image"
                                    onClick={() => removeImage(i)}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <button type="submit" className="btn-primary submit-btn" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit recipe"}
            </button>
        </form>
    );
}