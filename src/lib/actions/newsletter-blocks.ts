"use server";
// src/lib/actions/newsletter-blocks.ts
// Build ready-to-paste newsletter HTML blocks from a single veganeating.com URL,
// so the admin doesn't have to hand-assemble each section.
import { requireRole } from "@/lib/auth-helpers";
import { getRecipeBySlug } from "@/lib/recipes";
import { getArticleBySlug } from "@/lib/articles";
import { getNewsArticleBySlug } from "@/lib/news";
import { getThreadView } from "@/lib/forum";
import { parseBody, tiptapText } from "@/lib/article-body";

export type BlockResult = { ok: boolean; html?: string; error?: string };

const SITE = "https://veganeating.com";
const MEDIA = (process.env.SPACES_PUBLIC_BASE ?? process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? SITE).replace(/\/+$/, "");

function absImg(src?: string | null): string {
    if (!src) return "";
    if (/^https?:\/\//i.test(src)) return src;
    return `${MEDIA}/${src.replace(/^\.?\//, "")}`;
}
function firstSentence(text?: string | null): string {
    if (!text) return "";
    const c = text.replace(/\s+/g, " ").trim();
    const m = c.match(/^.*?[.!?](?=\s|$)/);
    return (m ? m[0] : c).trim();
}
function esc(s: string): string {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function parts(url: string): string[] {
    try {
        return new URL(url.trim(), SITE).pathname.split("/").filter(Boolean);
    } catch {
        return url.trim().split("/").filter(Boolean);
    }
}
function slugAfter(p: string[], seg: string): string | null {
    const i = p.indexOf(seg);
    if (i >= 0 && p[i + 1]) return p[i + 1];
    return p.length ? p[p.length - 1] : null;
}

// ---------- Recipe of the week ----------
export async function recipeBlock(url: string): Promise<BlockResult> {
    await requireRole(["ADMIN"]);
    const slug = slugAfter(parts(url), "recipes");
    if (!slug) return { ok: false, error: "Couldn't read that recipe URL." };
    const r = await getRecipeBySlug(slug);
    if (!r) return { ok: false, error: `No recipe found for “${slug}”.` };

    const href = `${SITE}/recipes/${r.slug}`;
    const img = absImg(r.image);
    const sentence = firstSentence(tiptapText(parseBody(r.description)));

    const html = `
        <!-- ===== FEATURED RECIPE ===== -->
        <tr>
          <td class="px" style="padding:26px 48px 0 48px;">
            <div style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#E15A22;">Recipe of the week</div>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:14px 48px 0 48px;">
            <a href="${href}" target="_blank" style="text-decoration:none;">
              <img src="${img}" width="504" alt="${esc(r.title)}" style="display:block; width:100%; max-width:504px; height:auto; border-radius:12px; background-color:#eae8de;">
            </a>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:18px 48px 0 48px;">
            <h2 class="h1" style="margin:0; font-family:'Fraunces',Georgia,'Times New Roman',serif; font-size:30px; line-height:34px; font-weight:600; color:#1c2317; letter-spacing:-0.3px;">${esc(r.title)}</h2>
            <p style="margin:10px 0 0 0; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:16px; line-height:25px; color:#6b6f63;">${esc(sentence)}</p>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:18px 48px 0 48px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td align="center" bgcolor="#E15A22" style="border-radius:999px;">
                <a href="${href}" target="_blank" style="display:inline-block; padding:13px 30px; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:999px;">Get the recipe →</a>
              </td>
            </tr></table>
          </td>
        </tr>`;
    return { ok: true, html };
}

// ---------- Worth a read (article or news) ----------
type ReadItem = { title: string; href: string; img: string; hook: string };

async function readItem(url: string): Promise<ReadItem | null> {
    const p = parts(url);
    if (p.includes("news")) {
        const slug = slugAfter(p, "news");
        const n = slug ? await getNewsArticleBySlug(slug) : null;
        if (!n) return null;
        return { title: n.title, href: `${SITE}/news/${n.slug}`, img: absImg(n.image), hook: firstSentence(n.description) };
    }
    const slug = slugAfter(p, "articles");
    const a = slug ? await getArticleBySlug(slug) : null;
    if (!a) return null;
    return { title: a.title, href: `${SITE}/articles/${a.slug}`, img: absImg(a.image), hook: firstSentence(tiptapText(a.body)) };
}

function readCell(it: ReadItem, side: "left" | "right"): string {
    const pad = side === "left" ? "padding-right:12px;" : "padding-left:12px;";
    return `<td class="stack" width="240" valign="top" style="${pad}">
              <a href="${it.href}" target="_blank" style="text-decoration:none;">
                <img src="${it.img}" width="240" alt="${esc(it.title)}" style="display:block; width:100%; max-width:240px; height:auto; border-radius:10px; background-color:#eae8de;">
              </a>
              <div style="font-family:'Fraunces',Georgia,serif; font-size:18px; line-height:23px; font-weight:600; color:#1c2317; padding-top:12px;">
                <a href="${it.href}" style="color:#1c2317; text-decoration:none;">${esc(it.title)}</a>
              </div>
              <div style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:14px; line-height:21px; color:#6b6f63; padding-top:5px;">${esc(it.hook)}</div>
            </td>`;
}

export async function worthReadBlock(urlA: string, urlB: string): Promise<BlockResult> {
    await requireRole(["ADMIN"]);
    const [a, b] = await Promise.all([
        urlA.trim() ? readItem(urlA) : Promise.resolve(null),
        urlB.trim() ? readItem(urlB) : Promise.resolve(null),
    ]);
    if (!a && !b) return { ok: false, error: "Couldn't read those article/news URLs." };

    const cells = b
        ? `${readCell(a!, "left")}\n                  <td class="gap" width="20" style="font-size:1px; line-height:1px;">&nbsp;</td>\n                  ${readCell(b, "right")}`
        : readCell(a!, "left").replace('width="240"', 'width="100%"');

    const html = `
        <!-- ===== WORTH A READ ===== -->
        <tr>
          <td class="px" style="padding:26px 48px 0 48px;">
            <div style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#2F7D38;">Worth a read</div>
          </td>
        </tr>
        <tr>
          <td class="px" style="padding:16px 48px 0 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  ${cells}
            </tr></table>
          </td>
        </tr>`;
    return { ok: true, html };
}

// ---------- From the forum ----------
export async function forumBlock(url: string): Promise<BlockResult> {
    await requireRole(["ADMIN"]);
    const p = parts(url);
    const i = p.indexOf("forum");
    const [cat, forum, thread] = i >= 0 ? [p[i + 1], p[i + 2], p[i + 3]] : [];
    if (!cat || !forum || !thread) return { ok: false, error: "Use a full forum thread URL (/forum/category/board/thread)." };

    const view = await getThreadView(cat, forum, thread);
    if (!view) return { ok: false, error: "Couldn't find that forum thread." };
    const op = view.posts[0];
    const author = op?.author ?? "a member";
    const href = `${SITE}/forum/${cat}/${forum}/${thread}`;

    const html = `
        <!-- ===== FROM THE FORUM ===== -->
        <tr>
          <td class="px" style="padding:30px 48px 0 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f4ec" style="background-color:#f1f4ec; border-radius:14px;"><tr>
              <td style="padding:24px 26px;">
                <div style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#2F7D38;">From the forum</div>
                <p style="margin:10px 0 0 0; font-family:'Fraunces',Georgia,serif; font-style:italic; font-size:20px; line-height:29px; color:#1c2317;">“${esc(view.title)}”</p>
                <p style="margin:10px 0 0 0; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:14px; color:#6b6f63;">— ${esc(author)} in ${esc(view.forum.name)} · <a href="${href}" style="color:#225F27; font-weight:600; text-decoration:none;">join the thread →</a></p>
              </td>
            </tr></table>
          </td>
        </tr>`;
    return { ok: true, html };
}
