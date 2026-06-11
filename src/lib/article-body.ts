// src/lib/article-body.ts
// Single source of truth for the article body shape, conversion, and text extraction.

export type Mark = { type: "bold" } | { type: "italic" } | { type: "link"; attrs: { href: string } };
export type TextNode = { type: "text"; text: string; marks?: Mark[] };
export type BodyNode =
    | { type: "paragraph"; content?: TextNode[] }
    | { type: "heading"; attrs: { level: number }; content?: TextNode[] }
    | { type: "blockquote"; content?: BodyNode[] }
    | { type: "bulletList"; content?: BodyNode[] }
    | { type: "orderedList"; content?: BodyNode[] }
    | { type: "listItem"; content?: BodyNode[] }
    | { type: "image"; attrs: { src: string; alt?: string; align?: "full" | "left" | "right" } }
    | { type: "table"; content?: BodyNode[] }
    | { type: "tableRow"; content?: BodyNode[] }
    | { type: "tableHeader"; attrs?: { colspan?: number; rowspan?: number }; content?: BodyNode[] }
    | { type: "tableCell"; attrs?: { colspan?: number; rowspan?: number }; content?: BodyNode[] }
    | { type: "taskList"; content?: BodyNode[] }
    | { type: "taskItem"; attrs?: { checked?: boolean }; content?: BodyNode[] }
    | { type: "codeBlock"; attrs?: { language?: string }; content?: TextNode[] }
    | { type: "details"; attrs?: { open?: boolean }; content?: BodyNode[] }
    | { type: "detailsSummary"; content?: TextNode[] }
    | { type: "detailsContent"; content?: BodyNode[] }
    | { type: "youtube"; attrs: { src: string; start?: number; width?: number; height?: number } };
export type TiptapDoc = { type: "doc"; content?: BodyNode[] };

const EMPTY_DOC: TiptapDoc = { type: "doc", content: [{ type: "paragraph" }] };

// Short, title-like, no sentence-ending punctuation → a section heading.
function looksLikeHeading(s: string): boolean {
    const t = s.trim();
    if (!t) return false;
    const words = t.split(/\s+/).length;
    const endsLikeSentence = /[.!?]["')\]]?$/.test(t);
    return words <= 12 && !endsLikeSentence;
}

// Legacy body (array of strings + separate gallery) → a real, editable doc.
// Mirrors the old renderer's placement: last image full, others alternate right/left.
export function legacyToDoc(paras: string[], gallery: string[] = []): TiptapDoc {
    const text = paras.map((p) => (p ?? "").trim()).filter(Boolean);
    const imgs = gallery.map((s) => s.trim()).filter(Boolean);
    if (!text.length && !imgs.length) return EMPTY_DOC;

    const n = text.length, m = imgs.length;
    const placeAt = new Map<number, { src: string; align: "full" | "left" | "right" }>();
    const positions: number[] = [];
    for (let j = 0; j < m; j++) {
        let pos = j === 0 ? 0 : Math.round((j * (n - 1)) / m);
        if (positions.length) pos = Math.max(pos, positions[positions.length - 1] + 1);
        positions.push(Math.min(Math.max(pos, 0), Math.max(n - 1, 0)));
    }
    positions.forEach((pos, j) =>
        placeAt.set(pos, { src: imgs[j], align: j === m - 1 ? "full" : j % 2 === 0 ? "right" : "left" }));

    const content: BodyNode[] = [];
    text.forEach((s, i) => {
        content.push(looksLikeHeading(s)
            ? { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: s }] }
            : { type: "paragraph", content: [{ type: "text", text: s }] });
        const img = placeAt.get(i);
        if (img) content.push({ type: "image", attrs: { src: img.src, align: img.align } });
    });
    if (n === 0) imgs.forEach((src) => content.push({ type: "image", attrs: { src, align: "full" } }));
    return { type: "doc", content };
}

// Reads the body column whether it holds a new doc or a legacy array.
export function parseBody(raw: string | null | undefined, gallery: string[] = []): TiptapDoc {
    if (!raw) return EMPTY_DOC;
    try {
        const v = JSON.parse(raw);
        if (v && typeof v === "object" && !Array.isArray(v) && v.type === "doc") return v as TiptapDoc;
        if (Array.isArray(v)) return legacyToDoc(v.map(String), gallery);
    } catch {
        return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: String(raw) }] }] };
    }
    return EMPTY_DOC;
}

export function tiptapText(doc: TiptapDoc): string {
    const out: string[] = [];
    const walk = (node: { type?: string; text?: string; content?: unknown[] }) => {
        if (node?.type === "text" && typeof node.text === "string") out.push(node.text);
        (node?.content as { type?: string; text?: string; content?: unknown[] }[] | undefined)?.forEach(walk);
    };
    walk(doc as never);
    return out.join(" ").replace(/\s+/g, " ").trim();
}

export function firstParagraphText(doc: TiptapDoc): string {
    const p = (doc.content ?? []).find((nd) => nd.type === "paragraph") as { content?: TextNode[] } | undefined;
    return (p?.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();
}