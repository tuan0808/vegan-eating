// src/lib/article-image-pipeline.ts
// AI image generation for an ARTICLE: a hero from the title, then one image per
// subtitle (referenced off the hero so the set looks cohesive). Pure logic — no
// DB, no Next imports. Emits unified progress via opts.onProgress.
//
// Unlike recipes, the section images are NOT inserted anywhere — they're returned
// so the panel can show them as a downloadable/draggable gallery. We only READ the
// article body (to find subtitles for prompts); we never write it.

import {
    generateImage,
    generateFromReference,
    type ImageQuality,
} from "@/lib/openai-images";
import { uploadPngToSpaces, loadImageBuffer } from "@/lib/spaces-upload";

export const MAX_SECTIONS = 12; // cap section images per article (cost + sanity)
const SECTION_CONCURRENCY = 4;
const ROUGH_USD_PER_IMAGE = 0.08;

export type ArticleRefMode = "generate" | "existing";

export type ArticleInput = {
    slug: string;
    title: string;
    subtitles: string[]; // already extracted (see extractArticleSubtitles)
};

export type GenProgress = { type: "progress"; done: number; label: string };

export type ArticleGeneratedSet = {
    heroUrl: string | null; // null in "existing" mode (hero unchanged)
    sectionUrls: string[]; // aligned to subtitles; "" = that one failed
    imagesGenerated: number;
    failed: number;
    estimatedCostUsd: number;
};

// ---- Subtitle extraction from the Tiptap body --------------------------------
// Treats as a "subtitle": any heading node, OR a paragraph that is a single short
// fully-bold line (people often use a bold line as a section title). Numbering like
// "1." / "2)" is stripped for a cleaner prompt. Read-only — never mutates the doc.
function textOf(node: any): string {
    if (!node) return "";
    if (node.type === "text") return node.text || "";
    if (Array.isArray(node.content)) return node.content.map(textOf).join("");
    return "";
}

function isAllBold(node: any): boolean {
    if (!Array.isArray(node?.content) || node.content.length === 0) return false;
    const texts = node.content.filter((c: any) => c?.type === "text" && (c.text || "").trim());
    if (texts.length === 0) return false;
    return texts.every(
        (c: any) => Array.isArray(c.marks) && c.marks.some((m: any) => m?.type === "bold")
    );
}

function cleanSubtitle(t: string): string {
    return t.replace(/^\s*\d+\s*[.)\-:]\s*/, "").trim(); // strip leading "1." / "1)" / "1 -" etc.
}

export function extractArticleSubtitles(bodyJson: string): string[] {
    let doc: any;
    try {
        doc = JSON.parse(bodyJson || "{}");
    } catch {
        return [];
    }
    const content = Array.isArray(doc?.content) ? doc.content : [];
    const out: string[] = [];
    for (const node of content) {
        if (node?.type === "heading") {
            // Major + minor section headings (h2/h3).
            const t = cleanSubtitle(textOf(node));
            if (t) out.push(t);
        } else if (node?.type === "paragraph" && isAllBold(node)) {
            // A short fully-bold line used as a section title.
            const t = textOf(node).trim();
            if (t && t.length <= 120) out.push(cleanSubtitle(t));
        } else if (node?.type === "orderedList" && Array.isArray(node.content)) {
            // Numbered sections: the first (title) line of each list item. The
            // descriptive paragraph that follows is ignored. Plain bulletLists are
            // intentionally NOT scanned — they're usually in-content bullets, not titles.
            for (const li of node.content) {
                const firstBlock = Array.isArray(li?.content) ? li.content[0] : null;
                const t = cleanSubtitle(textOf(firstBlock).trim());
                if (t && t.length <= 100) out.push(t);
            }
        }
    }
    return out;
}

// ---- Prompts -----------------------------------------------------------------
const STYLE = [
    "Editorial photographic style, natural light, clean and modern,",
    "wholesome plant-based / vegan mood where relevant.",
    "No text, no words, no letters, no labels, no watermarks.",
].join(" ");

function buildHeroPrompt(title: string): string {
    return `A compelling header image for a vegan lifestyle article titled "${title}". ${STYLE}`;
}

// Parse a subtitle into its list items, if any. Prefers an explicit parenthetical
// list ("(oil, temperature, layering)"); otherwise splits the whole heading on
// commas / semicolons / slashes / "and" / "&" / "vs". 2–4 items => a composition.
export function parseSectionItems(subtitle: string): string[] {
    const paren = subtitle.match(/\(([^)]*)\)/);
    const core = paren ? paren[1] : subtitle.replace(/\([^)]*\)/g, " ");
    return core
        .split(/\s*(?:,|;|\/|\bvs\.?\b|\band\b|&)\s*/i)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);
}

function buildSectionPrompt(title: string, subtitle: string, items: string[]): string {
    if (items.length >= 2 && items.length <= 4) {
        return [
            `A single cohesive ${items.length}-panel composition for the section "${subtitle}" of a vegan article titled "${title}".`,
            `Arrange ${items.length} equal side-by-side panels in one image, one panel for each of: ${items.join("; ")}.`,
            "Keep lighting, palette and styling identical across all panels so it reads as one intentionally designed piece, not separate photos.",
            "Match the style, color palette and lighting of the reference image.",
            STYLE,
        ].join(" ");
    }
    return [
        `An illustrative image for the section "${subtitle}" within a vegan article titled "${title}".`,
        "Match the style, color palette and lighting of the reference image so the article's images look like one cohesive set.",
        STYLE,
    ].join(" ");
}

// ---- Concurrency limiter -----------------------------------------------------
async function mapLimit<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let cursor = 0;
    async function worker() {
        while (cursor < items.length) {
            const i = cursor++;
            out[i] = await fn(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, worker));
    return out;
}

// ---- Main --------------------------------------------------------------------
export async function generateArticleImageSet(
    article: ArticleInput,
    opts: {
        quality?: ImageQuality;
        onProgress?: (ev: GenProgress) => void;
        signal?: AbortSignal;
        referenceMode?: ArticleRefMode;
        existingImageUrl?: string | null;
    } = {}
): Promise<ArticleGeneratedSet> {
    const quality = opts.quality || "medium";
    const emit = opts.onProgress || (() => {});
    const signal = opts.signal;
    const mode: ArticleRefMode = opts.referenceMode || "generate";
    const throwIfAborted = () => {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    };

    const subtitles = article.subtitles.slice(0, MAX_SECTIONS);
    const ts = Date.now();
    let done = 0;

    // Reference + hero.
    let heroUrl: string | null;
    let refBuf: Buffer;
    let refName = "reference.png";
    let refType = "image/png";

    throwIfAborted();
    if (mode === "existing" && opts.existingImageUrl) {
        const loaded = await loadImageBuffer(opts.existingImageUrl);
        refBuf = loaded.buffer;
        refName = loaded.name;
        refType = loaded.contentType;
        heroUrl = null; // keep current hero
        emit({ type: "progress", done, label: "Using your current hero as the reference…" });
    } else {
        const heroBuf = await generateImage({
            prompt: buildHeroPrompt(article.title),
            size: "1536x1024",
            quality,
        });
        const hero = await uploadPngToSpaces(heroBuf, `uploads/articles/${article.slug}/ai/hero-${ts}.png`);
        heroUrl = hero.url;
        refBuf = heroBuf;
        done++;
        emit({ type: "progress", done, label: "Hero ready · generating section images…" });
    }

    // Section images (edits anchored to the hero/reference).
    let completed = 0;
    const sectionUrls = await mapLimit(subtitles, SECTION_CONCURRENCY, async (subtitle, i) => {
        throwIfAborted();
        try {
            const items = parseSectionItems(subtitle);
            const isComposition = items.length >= 2 && items.length <= 4;
            const buf = await generateFromReference({
                reference: refBuf,
                referenceName: refName,
                referenceType: refType,
                prompt: buildSectionPrompt(article.title, subtitle, items),
                size: isComposition ? "1536x1024" : "1024x1024",
                quality,
                signal,
            });
            const up = await uploadPngToSpaces(buf, `uploads/articles/${article.slug}/ai/section-${i + 1}-${ts}.png`);
            completed++;
            done++;
            emit({ type: "progress", done, label: `Generating section images… (${completed}/${subtitles.length})` });
            return up.url;
        } catch (err) {
            if (signal?.aborted) throw err;
            completed++;
            done++;
            emit({ type: "progress", done, label: `Generating section images… (${completed}/${subtitles.length})` });
            console.error(`[article-pipeline] section ${i + 1} failed, continuing:`, err);
            return "";
        }
    });

    const succeeded = sectionUrls.filter(Boolean).length;
    const failed = sectionUrls.length - succeeded;
    const imagesGenerated = (heroUrl ? 1 : 0) + succeeded;
    return {
        heroUrl,
        sectionUrls,
        imagesGenerated,
        failed,
        estimatedCostUsd: +(imagesGenerated * ROUGH_USD_PER_IMAGE).toFixed(2),
    };
}

// Cost/total estimate. `sections` = number of subtitle images, `total` adds the hero.
export function estimateArticleImageCount(bodyJson: string): {
    sections: number;
    total: number;
    estimatedCostUsd: number;
} {
    const sections = Math.min(extractArticleSubtitles(bodyJson).length, MAX_SECTIONS);
    const total = sections + 1;
    return { sections, total, estimatedCostUsd: +(total * ROUGH_USD_PER_IMAGE).toFixed(2) };
}