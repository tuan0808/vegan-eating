// src/components/RecipeCard.tsx
import Link from "next/link";
import Image from "next/image";
import { type Recipe, fmtTime, titleCase } from "@/data/recipes";
import RecipeCardActions from "@/components/kitchen/RecipeCardActions";

export default function RecipeCard({
                                       r,
                                       initialSaved = false,
                                   }: {
    r: Recipe;
    initialSaved?: boolean;
}) {
    const tag = r.recipeType || titleCase(r.courses[0] || "Recipe");
    const chip = r.readyIn && r.readyIn <= 30 ? `${r.readyIn} min` : titleCase(r.courses[0] || r.recipeType || "Vegan");
    return (
        // Card is now a div; the link is an absolute overlay so the action
        // buttons can sit above it (a <button> can't legally nest in an <a>).
        <div className="card" style={{ position: "relative" }}>
            <Link
                href={`/recipes/${r.slug}`}
                className="card-overlay"
                aria-label={r.title}
                style={{ position: "absolute", inset: 0, zIndex: 1 }}
            />
            <div className="photo">
                {r.image ? (
                    <Image src={r.image} alt={r.title} fill sizes="(max-width:600px) 92vw, (max-width:1024px) 45vw, 360px" style={{ objectFit: "cover" }} />
                ) : (
                    <>
                        <div className={`ph ${r.ph}`} />
                        <span className="ph-label">Photo to import</span>
                    </>
                )}
                <span className="diet-chip">{chip}</span>
                <div style={{ position: "absolute", top: 10, right: 10, zIndex: 3 }}>
                    <RecipeCardActions recipeId={r.id} initialSaved={initialSaved} />
                </div>
            </div>
            <span className="tag">{tag}</span>
            <h3>{r.title}</h3>
            <div className="meta">
                <span>⏱ {fmtTime(r.readyIn)}</span>
                {r.calories ? <span>🔥 {r.calories} cal</span> : null}
            </div>
        </div>
    );
}