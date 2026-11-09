// Builds the mixed feed powering the home-page SocialCarousel: our Instagram
// post history with a recipe card slipped in every few posts, so the strip
// reads as a lively social wall rather than a wall of pure IG tiles.
//
// Everything here is plain serializable data — the server page builds the feed
// and hands it to the client carousel, so no Prisma/Recipe objects cross the
// boundary.
import type { IgPost } from "@/lib/instagram";
import { IG_HANDLE, proxiedIgImage } from "@/lib/instagram";
import type { Recipe } from "@/data/recipes";
import { titleCase } from "@/data/recipes";

export type FeedItem =
    | {
          kind: "ig";
          id: string;
          href: string;
          image: string;
          caption: string;
          isVideo: boolean;
          timestamp?: string;
      }
    | {
          kind: "recipe";
          id: string;
          href: string;
          image: string | null;
          ph: string;
          title: string;
          tag: string;
      }
    | {
          // Promo poster slipped in after each recipe; links to the giveaway.
          kind: "poster";
          id: string;
          href: string;
          image: string;
      };

/** How many IG posts to show before slipping in a recipe card. */
export const RECIPE_EVERY = 3;

/** Promo poster shown after every recipe card (links to the Whole Foods page).
 *  Web-sized webp (237KB) generated from the 22MB source posternew.png. */
const POSTER_IMAGE = "/header/posternew-web.webp";
const posterItem = (key: string | number): FeedItem => ({
    kind: "poster",
    id: `poster-${key}`,
    href: "/whole-foods",
    image: POSTER_IMAGE,
});

function igItem(p: IgPost): FeedItem {
    return {
        kind: "ig",
        id: `ig-${p.id}`,
        href: p.permalink || `https://instagram.com/${IG_HANDLE}`,
        image: proxiedIgImage(p.imageUrl),
        caption: p.caption || "",
        isVideo: p.isVideo,
        timestamp: p.timestamp,
    };
}

function recipeItem(r: Recipe): FeedItem {
    return {
        kind: "recipe",
        id: `recipe-${r.id}`,
        href: `/recipes/${r.slug}`,
        image: r.image,
        ph: r.ph,
        title: r.title,
        tag: r.recipeType || titleCase(r.courses[0] || "Recipe"),
    };
}

/**
 * Interleave IG posts with recipes: after every `every` posts, drop in the next
 * recipe (cycling through the pool). The feed is IG-led and ends on IG — we
 * never tack trailing recipes on past the last post.
 */
export function buildSocialFeed(posts: IgPost[], recipes: Recipe[], every = RECIPE_EVERY): FeedItem[] {
    const out: FeedItem[] = [];
    let r = 0;
    posts.forEach((p, i) => {
        out.push(igItem(p));
        const isLast = i === posts.length - 1;
        if (!isLast && every > 0 && (i + 1) % every === 0 && recipes.length) {
            out.push(recipeItem(recipes[r % recipes.length]));
            out.push(posterItem(i)); // giveaway poster right after each recipe
            r += 1;
        }
    });
    return out;
}
