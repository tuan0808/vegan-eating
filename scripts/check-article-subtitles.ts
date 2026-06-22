// scripts/check-article-subtitles.ts
//
// Dry inspection — NO image generation, NO cost. Shows what the subtitle
// extractor detects for one article, plus the raw top-level block structure of
// its Tiptap body so we can tune detection precisely.
//
//   npx tsx scripts/check-article-subtitles.ts <article-slug>

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { extractArticleSubtitles } from "../src/lib/article-image-pipeline";

function textOf(node: any): string {
    if (!node) return "";
    if (node.type === "text") return node.text || "";
    if (Array.isArray(node.content)) return node.content.map(textOf).join("");
    return "";
}

async function main() {
    const slug = process.argv[2];
    if (!slug) {
        console.error("Usage: npx tsx scripts/check-article-subtitles.ts <article-slug>");
        process.exit(1);
    }

    const a = await prisma.article.findUnique({ where: { slug } });
    if (!a) {
        console.error(`No article with slug "${slug}".`);
        await prisma.$disconnect();
        process.exit(1);
    }

    console.log(`\nTitle: ${a.title}`);

    // What the extractor currently catches:
    const subs = extractArticleSubtitles(a.body);
    console.log(`\nDetected ${subs.length} subtitle(s):`);
    subs.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));

    // Raw top-level block structure (so we can see headings vs bold paragraphs vs lists):
    let doc: any = {};
    try {
        doc = JSON.parse(a.body || "{}");
    } catch {
        console.log("\n(body is not valid JSON)");
    }
    const blocks = Array.isArray(doc?.content) ? doc.content : [];
    console.log(`\nTop-level blocks (${blocks.length}):`);
    blocks.forEach((n: any, i: number) => {
        const lvl = n?.attrs?.level ? ` h${n.attrs.level}` : "";
        const snippet = textOf(n).slice(0, 60).replace(/\n/g, " ");
        console.log(`  [${i}] ${n?.type}${lvl}  "${snippet}"`);
    });

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});