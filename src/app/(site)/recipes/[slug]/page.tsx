// src/app/recipes/[slug]/page.tsx
import { getRecipeBySlug } from "@/lib/recipes";
import { parseServings } from "@/lib/recipe-scale";
import { fmtTime, titleCase } from "@/data/recipes";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import RecipeTools from "@/components/RecipeTools";
import HeroTitle from "@/components/HeroTitle";
import RecipeGallery from "@/components/RecipeGallery";
import MethodSteps from "@/components/MethodSteps";

// First sentence of the description — for the hero blurb.
function firstSentence(text?: string | null): string {
  if (!text) return "";
  const c = text.replace(/\s+/g, " ").trim();
  const m = c.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : c).trim();
}
// Normalise bare image paths ("2025/01/foo.jpg" -> "/2025/01/foo.jpg").
function imgSrc(src?: string | null): string | null {
  if (!src) return null;
  if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
  return "/" + src.replace(/^\.?\//, "");
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const r = await getRecipeBySlug(params.slug);
  if (!r) return { title: "Recipe not found — vegan eating" };
  return { title: `${r.title} — vegan eating`, description: (r.description ?? "").slice(0, 155) };
}

export default async function RecipePage({ params }: { params: { slug: string } }) {
  const r = await getRecipeBySlug(params.slug);
  if (!r) notFound();

  const heroImg = imgSrc(r.image);
  const baseServings = parseServings(r.servings);
  const timing = [
    r.prepTime ? `${r.prepTime} min prep` : null,
    r.cookTime ? `${r.cookTime} min cook` : null,
    r.readyIn ? `${fmtTime(r.readyIn)} total` : null,
  ].filter(Boolean).join(" · ");

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Recipe",
    name: r.title, description: r.description, recipeCategory: r.recipeType,
    recipeYield: r.servings || undefined,
    prepTime: r.prepTime ? `PT${r.prepTime}M` : undefined,
    cookTime: r.cookTime ? `PT${r.cookTime}M` : undefined,
    totalTime: r.readyIn ? `PT${r.readyIn}M` : undefined,
    keywords: ["vegan", "plant-based", ...r.courses].join(", "),
    nutrition: r.calories ? { "@type": "NutritionInformation", calories: `${r.calories} kcal` } : undefined,
    recipeIngredient: r.ingredients,
    recipeInstructions: r.steps.map((s) => ({ "@type": "HowToStep", text: s })),
  };

  return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="recipe-hero">
          <div className="hero-bg">
            {heroImg ? (
                <Image src={heroImg} alt={r.title} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
            ) : <div className={`ph ${r.ph}`} />}
          </div>
          <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
            <span className="kicker" style={{ color: "#A7D98C" }}>{r.recipeType || "Recipe"}</span>
            <HeroTitle title={r.title} style={{ fontSize: "clamp(38px,5vw,68px)", margin: "16px 0 14px", maxWidth: 760 }} />
            <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>{firstSentence(r.description)}</p>
            <div className="hero-meta">
              {r.readyIn ? <span>⏱ <b>{fmtTime(r.readyIn)}</b></span> : null}
              {r.servings ? <span>🍽 <b>{r.servings}</b></span> : null}
              {r.calories ? <span>🔥 <b>{r.calories} cal</b></span> : null}
              {r.allergens.length ? <span>🏷 <b>{r.allergens.slice(0, 3).join(", ")}</b></span> : null}
            </div>
            <div className="hero-social" style={{ marginTop: 22 }}>
              <div className="stack">
                <span className="avatar a2">R</span><span className="avatar a3">K</span>
                <span className="avatar a4">M</span><span className="avatar a5">J</span>
              </div>
              <p><b>212 members</b> cooked this &amp; left notes</p>
            </div>
          </div>
        </section>

        <RecipeGallery images={r.gallery} title={r.title} />

        <div className="wrap">
          <div className="recipe-body">
            <RecipeTools
                ingredients={r.ingredients}
                baseServings={baseServings}
                steps={r.steps}
                title={r.title}
                timing={timing}
            />
            <div>
              <span className="kicker">About this recipe</span>
              <p style={{ margin: "10px 0 32px", fontSize: 17, lineHeight: 1.7 }}>{r.description}</p>

              <h2 style={{ fontSize: 32, marginBottom: 8 }}>Method</h2>
              <p style={{ color: "var(--muted)", marginBottom: 28 }}>
                {[r.prepTime ? `${r.prepTime} min prep` : null, r.cookTime ? `${r.cookTime} min cook` : null].filter(Boolean).join(" · ") || "Tested in our kitchen"}
              </p>
              <MethodSteps steps={r.steps} photos={r.cookalong} />
              {r.courses.length > 0 && (
                  <p style={{ marginTop: 30, fontSize: 14, color: "var(--muted)" }}>Courses: {r.courses.map((c) => titleCase(c)).join(", ")}</p>
              )}
              <div className="note-box">
                <span className="kicker">From the community</span>
                <p style={{ marginTop: 10, fontSize: 13.5, color: "var(--muted)" }}>Sign in to rate this recipe, leave a note, or share a photo of your cook.</p>
              </div>
              {r.sourceUrl ? <p style={{ marginTop: 24, fontSize: 13, color: "var(--muted)" }}><a href={r.sourceUrl} style={{ color: "var(--terra)" }}>View original</a></p> : null}
            </div>
          </div>
        </div>
      </>
  );
}