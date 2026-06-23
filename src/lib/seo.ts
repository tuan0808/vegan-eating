// src/lib/seo.ts
//
// Central SEO config + a single metadata builder so every route emits a
// consistent canonical URL, Open Graph card, and Twitter card. Per-page OG
// *images* are produced by the file-convention `opengraph-image.tsx` routes
// (see src/lib/og.tsx) — Next merges those into the metadata automatically, so
// we deliberately don't set `openGraph.images` here.
import type { Metadata } from "next";

// No trailing slash. Prod sets NEXT_PUBLIC_SITE_URL to the real origin; the
// fallback keeps canonical/OG URLs absolute even if the env is missing.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://veganeating.com").replace(/\/$/, "");
export const SITE_NAME = "vegan eating";
export const SITE_TAGLINE = "tested plant-based recipes & community";
export const SITE_DESCRIPTION =
    "Eat green, feel green. Honest, tested vegan recipes for everyday cooking, plus a community to cook them with. No ads, no life story.";
// The home/document default title (no template suffix — that would duplicate the name).
export const SITE_DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

// Any path → absolute URL. http(s) inputs pass through untouched.
export function absoluteUrl(path = "/"): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${SITE_URL}/${path.replace(/^\//, "")}`;
}

// Free-form date string (Article.date, Recipe.date) → ISO 8601, or undefined
// when it won't parse — so we never feed `new Date().toISOString()` a value
// that throws, and never emit a garbage og:published_time.
export function toISO(raw?: string | Date | null): string | undefined {
    if (!raw) return undefined;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// The full <title> as it renders after the template (`%s — vegan eating`).
// We set this explicitly on the OG/Twitter cards so social titles never depend
// on template-inheritance subtleties.
function socialTitle(title?: string): string {
    return title ? `${title} — ${SITE_NAME}` : SITE_DEFAULT_TITLE;
}

type PageMetaInput = {
    /** Bare page title. The root template appends " — vegan eating". Omit for the home default. */
    title?: string;
    /** ~155-char meta description. Falls back to the site description. */
    description?: string;
    /** Route path, e.g. "/recipes/foo" — drives canonical + og:url. */
    path: string;
    /** og:type. "article" for posts/recipes/news, "website" otherwise. */
    type?: "website" | "article";
    /** ISO publish date for og article:published_time. */
    publishedTime?: string;
    /** Explicit OG image override. Normally omit — the opengraph-image route supplies it. */
    images?: string[];
    /** Keep the page out of the index (e.g. thin/utility pages). */
    noIndex?: boolean;
};

// Site-wide Organization + WebSite JSON-LD, rendered once in the root layout.
// Organization gives Google the brand identity (name/url/logo); WebSite with a
// SearchAction declares the on-site search so Google can show a sitelinks search
// box. Returned as a @graph so both live in a single <script>.
export function siteJsonLd(): Record<string, unknown> {
    const orgId = `${SITE_URL}/#organization`;
    return {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": orgId,
                name: SITE_NAME,
                url: SITE_URL,
                description: SITE_DESCRIPTION,
                logo: { "@type": "ImageObject", url: absoluteUrl("/android-chrome-512x512.png") },
            },
            {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                name: SITE_NAME,
                url: SITE_URL,
                description: SITE_DESCRIPTION,
                publisher: { "@id": orgId },
                potentialAction: {
                    "@type": "SearchAction",
                    target: {
                        "@type": "EntryPoint",
                        urlTemplate: `${SITE_URL}/recipes?q={search_term_string}`,
                    },
                    "query-input": "required name=search_term_string",
                },
            },
        ],
    };
}

// Serialised form for a <script type="application/ld+json">. The `<` escape
// prevents any "</script>" inside a field from breaking out of the tag.
export function siteJsonLdScript(): string {
    return JSON.stringify(siteJsonLd()).replace(/</g, "\\u003c");
}

// schema.org/BreadcrumbList JSON-LD for a detail page's trail. Pass the crumbs
// in order, root first, e.g. [{name:"Recipes", path:"/recipes"}, {name: title,
// path:"/recipes/foo"}] — a leading Home crumb is prepended automatically.
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]): Record<string, unknown> {
    const trail = [{ name: "Home", path: "/" }, ...crumbs];
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: trail.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: absoluteUrl(c.path),
        })),
    };
}

// Serialised form for a <script type="application/ld+json">. The `<` escape
// prevents any "</script>" inside a crumb name from breaking out of the tag.
export function breadcrumbJsonLdScript(crumbs: { name: string; path: string }[]): string {
    return JSON.stringify(breadcrumbJsonLd(crumbs)).replace(/</g, "\\u003c");
}

/** Build a consistent Metadata object (canonical + Open Graph + Twitter) for a page. */
export function pageMetadata(input: PageMetaInput): Metadata {
    const { title, description, path, type = "website", publishedTime, images, noIndex } = input;
    const url = absoluteUrl(path);
    const desc = description || SITE_DESCRIPTION;

    const meta: Metadata = {
        title,
        description: desc,
        alternates: { canonical: url },
        openGraph: {
            type,
            url,
            siteName: SITE_NAME,
            title: socialTitle(title),
            description: desc,
            ...(publishedTime ? { publishedTime } : {}),
            ...(images ? { images } : {}),
        },
        twitter: {
            card: "summary_large_image",
            title: socialTitle(title),
            description: desc,
            ...(images ? { images } : {}),
        },
    };
    if (noIndex) meta.robots = { index: false, follow: false };
    return meta;
}
