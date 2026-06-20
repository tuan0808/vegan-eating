// src/components/Sections.tsx
import Link from "next/link";
import NewsletterModal from "./NewsletterModal";
import { promise } from "@/data/site";
import HeroTitle from "./HeroTitle";
import RecipeViews from "./RecipeViews";
import { viewSummary } from "@/lib/views";
import { getRatingSummary } from "@/lib/comments";
import type { Recipe } from "@/data/recipes";

const Arrow = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

// First sentence of the recipe description — up to the first . ! or ?
function firstSentence(text?: string | null): string {
    if (!text) return "";
    const clean = text.replace(/\s+/g, " ").trim();
    const m = clean.match(/^.*?[.!?](?=\s|$)/);
    return (m ? m[0] : clean).trim();
}

// Ensure local image paths are absolute from the site root (handles WP imports
// stored as "2025/01/foo.jpg" without a leading slash). Leaves full URLs alone.
function imgSrc(src?: string | null): string | null {
    if (!src) return null;
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return "/" + src.replace(/^\.?\//, "");
}

// "55" -> "55 min", "55 min" -> "55 min"
function timeLabel(t?: string | number | null): string | null {
    if (t === null || t === undefined || t === "") return null;
    const s = String(t).trim();
    return /^\d+$/.test(s) ? `${s} min` : s;
}

// "6" -> "Serves 6", "Serves 6" -> "Serves 6"
function servingsLabel(s?: string | null): string | null {
    if (!s) return null;
    const v = String(s).trim();
    return /^\d+$/.test(v) ? `Serves ${v}` : v;
}

export async function Hero({ recipe }: { recipe?: Recipe }) {
    const title = recipe?.title ?? "Slow-roasted tomato and almond-ricotta galette";
    const dek = firstSentence(recipe?.description) ||
        "A free-form summer tart with a buttery, flaky crust — built for the height of tomato season and almost impossible to get wrong.";
    const href = recipe ? `/recipes/${recipe.slug}` : "/recipes/harissa-roasted-cauliflower-steaks";
    const img = imgSrc(recipe?.image);
    const ph = recipe?.ph || "p5";
    const time = timeLabel(recipe?.readyIn);
    const servings = servingsLabel(recipe?.servings);
    // Display-only on the home hero — the visitor isn't actually viewing the
    // recipe here, so we read the summary but don't log (no `log` prop below).
    const views = recipe ? await viewSummary("recipe", recipe.id) : null;
    // Real review average, from rated comments. Null/zero-count → no stars shown.
    const rating = recipe ? await getRatingSummary({ recipeId: recipe.id }) : null;
    const stars = rating ? Math.round(rating.average) : 0;

    return (
        <section className="hero">
            <div className="hero-bg">
                {img ? (
                    <img
                        src={img}
                        alt=""
                        aria-hidden="true"
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                ) : (
                    <div className={`ph ${ph}`} />
                )}
            </div>
            {!img && <span className="hero-photo-note">Your hero photo here</span>}
            <div className="wrap">
                <div className="hero-copy">
                    <span className="kicker">Recipe of the week</span>
                    <HeroTitle title={title} />
                    <p className="dek">{dek}</p>
                    <div className="hero-meta">
                        {time && <span>⏱ <b>{time}</b></span>}
                        {servings && <span>🍽 <b>{servings}</b></span>}
                        {rating && rating.count > 0 && (
                            <span className="stars">
                                {"★".repeat(stars)}{"☆".repeat(5 - stars)} <b style={{ color: "#fff" }}>{rating.average.toFixed(1)}</b>
                            </span>
                        )}
                    </div>
                    <Link href={href} className="btn-primary">
                        Read the recipe <Arrow />
                    </Link>
                    {recipe && views ? (
                        <RecipeViews kind="recipe" slug={recipe.slug} count={views.count} initials={views.initials} />
                    ) : (
                        <div className="hero-social">
                            <div className="stack">
                                <span className="avatar a2">V</span>
                            </div>
                            <p><b>1</b> cook has viewed this</p>
                        </div>
                    )}
                </div>
            </div>
            <a href="#promise" className="scroll-cue" aria-label="Scroll down"><span /></a>
        </section>
    );
}

const icons: Record<string, React.ReactNode> = {
    check: <path d="M20 6 9 17l-5-5" />,
    bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />,
    people: (
        <>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </>
    ),
};

export function PromiseStrip() {
    return (
        <div className="wrap" id="promise">

        </div>
    );
}

export function Footer() {
    return (
        <footer>
            <div className="wrap">
                <div className="foot-top">
                    <div>
                        <Link href="/" aria-label="vegan eating home">
                            {/* Footer is a light surface, so it uses the ink wordmark
                                variant (/logo/logo-ink.svg). The standard logo.svg is
                                white-on-dark and would vanish here. */}
                            <img
                                src="/logo/logo-ink.svg"
                                alt="vegan eating"
                                width={166}
                                height={44}
                                style={{ height: 44, width: "auto", display: "block" }}
                            />
                        </Link>
                        <p style={{ marginTop: 14 }}>Eat green, feel green. Honest, tested plant-based recipes for everyday cooking — and a community to cook them with.</p>
                    </div>
                    <div className="fcol">
                        <h4>Recipes</h4>
                        <Link href="/recipes">Breakfast</Link><Link href="/recipes">Weeknight dinners</Link>
                        <Link href="/recipes">Baking</Link><Link href="/recipes">Desserts</Link>
                    </div>
                    <div className="fcol">
                        <h4>Explore</h4>
                        <Link href="/recipes">All recipes</Link><Link href="/forum">Forum</Link>
                        <Link href="/tools/veganize">Veganize a recipe</Link><Link href="/submit">Submit a recipe</Link>
                    </div>
                    <div className="fcol">
                        <h4>About</h4>
                        <Link href="/about">Our story</Link>
                        <Link href="/contact">Contact</Link>
                        <NewsletterModal />
                    </div>
                </div>
                <div className="foot-bot">
                    <span>© 2026 vegan eating — eat green, feel green.</span>
                    <span>Your gut, your glow, your rules..</span>
                </div>
            </div>
        </footer>
    );
}