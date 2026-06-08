// src/components/RecipeCard.tsx
import Link from "next/link";
import Image from "next/image";
import { type Recipe, fmtTime, titleCase } from "@/data/recipes";

export default function RecipeCard({ r }: { r: Recipe }) {
    const tag = r.recipeType || titleCase(r.courses[0] || "Recipe");
    const chip = r.readyIn && r.readyIn <= 30 ? `${r.readyIn} min` : titleCase(r.courses[0] || r.recipeType || "Vegan");
    return (
        <Link href={`/recipes/${r.slug}`} className="card">
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
                <div className="bookmark">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1C2A1A" strokeWidth="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
            </div>
            <span className="tag">{tag}</span>
            <h3>{r.title}</h3>
            <div className="meta">
                <span>⏱ {fmtTime(r.readyIn)}</span>
                {r.calories ? <span>🔥 {r.calories} cal</span> : null}
            </div>
        </Link>
    );
}