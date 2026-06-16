// src/lib/news-body.ts
import type { TiptapDoc } from "@/lib/article-body";

// Turns newsdata's plain-text `content` into a Tiptap doc, so a news story
// renders through the exact same ArticleBody pipeline as a native article —
// paragraphs, dropcap on the first one, and (later) woven figures.
//
// Pass `images` to scatter figures through the body. It's empty for now; when
// you wire a licensed image service, hand the URLs in here and they'll drop in
// every few paragraphs, alternating sides, the way ArticleFigure expects.
export function textToTiptap(text: string, images: string[] = []): TiptapDoc {
    const paragraphs = toParagraphs(text);
    const content: Array<Record<string, unknown>> = [];

    let imgIdx = 0;
    paragraphs.forEach((para, i) => {
        content.push({ type: "paragraph", content: [{ type: "text", text: para }] });

        const everyThird = i > 0 && (i + 1) % 3 === 0;
        if (images.length && everyThird && imgIdx < images.length) {
            content.push({
                type: "image",
                attrs: { src: images[imgIdx], align: imgIdx % 2 === 0 ? "right" : "left" },
            });
            imgIdx++;
        }
    });

    return { type: "doc", content } as unknown as TiptapDoc;
}

// newsdata often returns the whole article as one giant run-on string. Honour any
// real line breaks first, then split oversized chunks into ~3-sentence paragraphs.
function toParagraphs(raw: string): string[] {
    const text = (raw ?? "").replace(/\r\n/g, "\n").trim();
    if (!text) return [];

    const chunks = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];

    for (const chunk of chunks) {
        if (chunk.length <= 600) {
            out.push(chunk);
            continue;
        }
        const sentences = chunk.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? [chunk];
        let buf = "";
        let count = 0;
        for (const s of sentences) {
            buf += s;
            count++;
            if (count >= 3 && buf.length >= 280) {
                out.push(buf.trim());
                buf = "";
                count = 0;
            }
        }
        if (buf.trim()) out.push(buf.trim());
    }

    return out;
}