// src/app/(site)/recipes/[slug]/page.tsx
import { getRecipeBySlug, randomRecipes, latestRecipes } from "@/lib/recipes";
import { parseServings } from "@/lib/recipe-scale";
import { fmtTime, titleCase } from "@/data/recipes";
import { viewSummary } from "@/lib/views";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import RecipeTools from "@/components/RecipeTools";
import HeroTitle from "@/components/HeroTitle";
import RecipeGallery from "@/components/RecipeGallery";
import MethodSteps from "@/components/MethodSteps";
import PostFooter from "@/components/post/PostFooter";
import RecipeViews from "@/components/RecipeViews";
import ArticleBody from "@/app/(site)/articles/[slug]/ArticleBody";
import { parseBody, tiptapText } from "@/lib/article-body";
import RecipeCardActions from "@/components/kitchen/RecipeCardActions";
import "@/app/(site)/articles/[slug]/article-content.css";
import "@/styles/kitchen.css";
import { recipeJsonLdScript } from "@/lib/recipe-jsonld";
import { pageMetadata, toISO, breadcrumbJsonLdScript } from "@/lib/seo";


// ISR: the page renders statically and revalidates hourly. Anything
// per-request (saved state, view logging, comments) lives in client islands
// so this route never reads cookies/searchParams and stays cacheable.
// (On a recipe edit, call revalidatePath(`/recipes/${slug}`) for instant refresh.)
export const revalidate = 3600;

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
  if (!r) return { title: "Recipe not found", robots: { index: false, follow: false } };
  return pageMetadata({
    title: r.title,
    description: tiptapText(parseBody(r.description)).slice(0, 155),
    path: `/recipes/${r.slug}`,
    type: "article",
    publishedTime: toISO(r.date),
  });
}

export default async function RecipePage({ params }: { params: { slug: string } }) {
  const r = await getRecipeBySlug(params.slug);
  if (!r) notFound();

  const heroImg = imgSrc(r.image);
  const baseServings = parseServings(r.servings);
  const descDoc = parseBody(r.description);
  const descText = tiptapText(descDoc);
  const views = await viewSummary("recipe", r.id);

  // Footer "other posts" + tag chips (recipes have no tags field, so use courses + cuisines).
  const [randoms, latest] = await Promise.all([randomRecipes(7), latestRecipes(7)]);
  const related = randoms.filter((x) => x.slug !== r.slug).slice(0, 6).map((x) => ({ slug: x.slug, title: x.title, date: x.date, image: x.image }));
  const more = latest.filter((x) => x.slug !== r.slug).slice(0, 6).map((x) => ({ slug: x.slug, title: x.title, date: x.date, image: x.image }));
  const tags = Array.from(new Set<string>([...r.courses, ...r.cuisines])).map((t) => titleCase(t));
  const timing = [
    r.prepTime ? `${r.prepTime} min prep` : null,
    r.cookTime ? `${r.cookTime} min cook` : null,
    r.readyIn ? `${fmtTime(r.readyIn)} total` : null,
  ].filter(Boolean).join(" · ");

  // schema.org/Recipe JSON-LD. Pass the clean description text (r.description
  // is Tiptap JSON). The helper handles ISO durations, absolute URLs, and
  // the array fields your data layer already parsed.
  const recipeJsonLd = recipeJsonLdScript(
      { ...r, description: descText },
      {
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://veganeating.com",
        mediaBaseUrl: process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
      },
  );

  const breadcrumbJsonLd = breadcrumbJsonLdScript([
    { name: "Recipes", path: "/recipes" },
    { name: r.title, path: `/recipes/${r.slug}` },
  ]);

  return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: recipeJsonLd }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
        <section className="recipe-hero">
          <div className="hero-bg">
            {heroImg ? (
                <Image src={heroImg} alt={r.title} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
            ) : <div className={`ph ${r.ph}`} />}
          </div>
          <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
            <span className="kicker" style={{ color: "#A7D98C" }}>{r.recipeType || "Recipe"}</span>
            <HeroTitle title={r.title} style={{ fontSize: "clamp(38px,5vw,68px)", margin: "16px 0 14px", maxWidth: 760 }} />
            <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>{firstSentence(descText)}</p>
            <div className="hero-meta">
              {r.readyIn ? <span>⏱ <b>{fmtTime(r.readyIn)}</b></span> : null}
              {r.servings ? <span>🍽 <b>{r.servings}</b></span> : null}
              {r.calories ? <span>🔥 <b>{r.calories} cal</b></span> : null}
              {r.allergens.length ? <span>🏷 <b>{r.allergens.slice(0, 3).join(", ")}</b></span> : null}
            </div>
            <RecipeViews kind="recipe" slug={r.slug} count={views.count} initials={views.initials} log />
            <div style={{ marginTop: 18 }}>
              <RecipeCardActions recipeId={r.id} fetchSaved />
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
                recipeId={r.id}
                photos={r.cookalong}
            />
            <div>
              <span className="kicker">About this recipe</span>
              <div style={{ margin: "10px 0 32px" }}>
                <ArticleBody doc={descDoc} lead={false} />
              </div>

              <h2 style={{ fontSize: 32, marginBottom: 8 }}>Method</h2>
              <p style={{ color: "var(--muted)", marginBottom: 28 }}>
                {[r.prepTime ? `${r.prepTime} min prep` : null, r.cookTime ? `${r.cookTime} min cook` : null].filter(Boolean).join(" · ") || "Tested in our kitchen"}
              </p>
              <MethodSteps steps={r.steps} photos={r.cookalong} ingredients={r.ingredients} />
              {r.courses.length > 0 && (
                  <p style={{ marginTop: 30, fontSize: 14, color: "var(--muted)" }}>Courses: {r.courses.map((c) => titleCase(c)).join(", ")}</p>
              )}

              <PostFooter
                  tags={tags}
                  shareTitle={r.title}
                  shareNoun="recipe"
                  authorName={r.author || "The vegan eating kitchen"}
                  commentTarget={{ recipeId: r.id }}
                  commentPath={`/recipes/${params.slug}`}
                  related={related}
                  more={more}
                  basePath="/recipes"
                  otherTitle="More recipes"
                  relatedLabel="More like this"
                  moreLabel="Fresh from the kitchen"
              />
            </div>
          </div>
        </div>
      </>
  );
}