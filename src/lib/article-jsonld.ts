// src/lib/article-jsonld.ts
//
// Builds schema.org/BlogPosting JSON-LD from an Article row.
// Articles have no description column, so pass a pre-computed `description`
// (first paragraph of the body) via opts — same way the page derives the
// <meta> description. Helpers are kept local so this file drops in on its own.

type ArticleLike = {
    slug: string;
    title: string;
    image?: string | null;
    date?: string | null; // free-form string; parsed defensively
};

type BuildOpts = {
    siteUrl: string; // "https://veganeating.com" (no trailing slash)
    mediaBaseUrl?: string; // CDN base for relative image paths; falls back to siteUrl
    description?: string; // ~155-char summary (first paragraph)
    author?: string | null; // person byline; falls back to the Organization
    publisherName?: string; // default "vegan eating"
    publisherLogo?: string; // optional logo URL → publisher.logo ImageObject
};

// --- helpers ---------------------------------------------------------------

// Any URL inside JSON-LD must be absolute. Leaves http(s) URLs untouched.
function absoluteUrl(path: string, base: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// Free-form date string → ISO. Returns undefined if it won't parse, so we
// never emit a garbage datePublished.
function toISODate(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// --- builder ---------------------------------------------------------------

export function buildArticleJsonLd(article: ArticleLike, opts: BuildOpts): Record<string, unknown> {
    const {
        siteUrl,
        mediaBaseUrl,
        description,
        author,
        publisherName = "vegan eating",
        publisherLogo,
    } = opts;
    const base = mediaBaseUrl ?? siteUrl;
    const url = `${siteUrl.replace(/\/$/, "")}/articles/${article.slug}`;

    const json: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        url,
        // The canonical page for this content is THIS page — never the external
        // import source. Using sourceUrl here told Google the content's home was
        // the original site, which works against your own ranking.
        mainEntityOfPage: url,
    };

    if (article.image) json.image = [absoluteUrl(article.image, base)];

    const published = toISODate(article.date);
    if (published) json.datePublished = published;

    if (description) json.description = description;

    // Real byline when you have one; otherwise the Organization is a valid
    // author and beats a placeholder name.
    json.author = author
        ? { "@type": "Person", name: author }
        : { "@type": "Organization", name: publisherName };

    const publisher: Record<string, unknown> = { "@type": "Organization", name: publisherName };
    if (publisherLogo) {
        publisher.logo = { "@type": "ImageObject", url: absoluteUrl(publisherLogo, base) };
    }
    json.publisher = publisher;

    return json;
}

// Returns the string for a <script type="application/ld+json">. The `<`
// escape prevents a "</script>" inside any field from breaking out of the tag.
export function articleJsonLdScript(article: ArticleLike, opts: BuildOpts): string {
    return JSON.stringify(buildArticleJsonLd(article, opts)).replace(/</g, "\\u003c");
}