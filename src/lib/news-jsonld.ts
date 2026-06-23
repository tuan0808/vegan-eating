// src/lib/news-jsonld.ts
//
// Builds schema.org/NewsArticle JSON-LD from a stored NewsArticle row.
// News stories are curated from external publishers and re-hosted at permanent
// URLs on this site, so the *page* publisher is "vegan eating" while the
// content's author is the original source organisation (when we know it).
// Pure functions, no Prisma import — pass the row in. Mirrors article-jsonld.ts.

type NewsLike = {
    slug: string;
    title: string;
    description?: string | null;
    image?: string | null; // usually an absolute publisher URL
    source?: string | null; // original publisher name, e.g. "The Guardian"
    pubDate?: Date | string | null; // Date in the DB; parsed defensively
};

type BuildOpts = {
    siteUrl: string; // "https://veganeating.com" (no trailing slash)
    mediaBaseUrl?: string; // CDN base for relative image paths; falls back to siteUrl
    publisherName?: string; // default "vegan eating"
    publisherLogo?: string; // optional logo URL → publisher.logo ImageObject
};

// --- helpers ---------------------------------------------------------------

// Any URL inside JSON-LD must be absolute. Leaves http(s) URLs untouched.
function absoluteUrl(path: string, base: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

// Date | free-form string → ISO. Returns undefined if it won't parse, so we
// never emit a garbage datePublished.
function toISODate(raw?: Date | string | null): string | undefined {
    if (!raw) return undefined;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// --- builder ---------------------------------------------------------------

export function buildNewsJsonLd(news: NewsLike, opts: BuildOpts): Record<string, unknown> {
    const { siteUrl, mediaBaseUrl, publisherName = "vegan eating", publisherLogo } = opts;
    const base = mediaBaseUrl ?? siteUrl;
    const url = `${siteUrl.replace(/\/$/, "")}/news/${news.slug}`;

    const json: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: news.title,
        url,
        // The canonical page for this content is THIS page — the permanent URL
        // we host it at — not the external original (which we link out to).
        mainEntityOfPage: url,
    };

    if (news.image) json.image = [absoluteUrl(news.image, base)];

    const published = toISODate(news.pubDate);
    if (published) json.datePublished = published;

    if (news.description) json.description = news.description;

    // The story's author is the original publisher when we have it; otherwise
    // the Organization re-hosting it is a valid author and beats a placeholder.
    json.author = news.source
        ? { "@type": "Organization", name: news.source }
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
export function newsJsonLdScript(news: NewsLike, opts: BuildOpts): string {
    return JSON.stringify(buildNewsJsonLd(news, opts)).replace(/</g, "\\u003c");
}
