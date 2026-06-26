// src/lib/welcome-blocks.ts
// Dynamic sections injected into the welcome email at send time:
//   {{category_cards}} -> 2 randomly-picked homepage collection cards
//   {{latest_thread}}  -> the most recent forum thread
import { prisma } from "./prisma";
import { homeCollections } from "./category-config";
import { countByCat } from "./recipes";

const SITE = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://veganeating.com").replace(/\/+$/, "");

function esc(s: string): string {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Card background gradients mirror the homepage .ph.p* classes (solid = Outlook fallback).
const PH: Record<string, { solid: string; grad: string }> = {
    p1: { solid: "#B23E26", grad: "linear-gradient(135deg,#E4A06A,#B23E26)" },
    p2: { solid: "#6E7B3F", grad: "linear-gradient(135deg,#D9C27A,#6E7B3F)" },
    p3: { solid: "#A85A2E", grad: "linear-gradient(135deg,#E9B98A,#A85A2E)" },
    p4: { solid: "#7A5E9A", grad: "linear-gradient(135deg,#CBB7E0,#7A5E9A)" },
    p5: { solid: "#C25C3C", grad: "linear-gradient(135deg,#F0C9A0,#C25C3C)" },
    p6: { solid: "#566B3E", grad: "linear-gradient(135deg,#BFD0A8,#566B3E)" },
    p7: { solid: "#D99A3C", grad: "linear-gradient(135deg,#F2D0A0,#D99A3C)" },
};

function categoryCard(label: string, count: number, href: string, ph: string, padStyle: string): string {
    const g = PH[ph] ?? PH.p1;
    return `<td class="stack" width="48%" valign="top" style="${padStyle}">
      <a href="${href}" target="_blank" style="text-decoration:none; display:block;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${g.solid}" style="background-color:${g.solid}; background-image:${g.grad}; border-radius:14px;">
          <tr><td valign="bottom" style="padding:24px 20px; height:104px;">
            <div style="font-family:'Fraunces',Georgia,serif; font-size:21px; font-weight:600; line-height:1.12; color:#ffffff;">${esc(label)}</div>
            <div style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:13px; font-weight:600; color:rgba(255,255,255,0.92); padding-top:8px;">${count} recipes &nbsp;→</div>
          </td></tr>
        </table>
      </a>
    </td>`;
}

/** Two random homepage collection cards (auto-grows as categories are added). */
export async function categoryCardsHtml(): Promise<string> {
    const cats = await homeCollections();
    if (!cats.length) return "";
    const pick = [...cats].sort(() => Math.random() - 0.5).slice(0, 2);
    const counts = await Promise.all(pick.map((c) => countByCat(c.slug)));
    const cells = pick.map((c, i) =>
        categoryCard(c.label, counts[i], `${SITE}/recipes?cat=${c.slug}`, c.ph, i === 0 ? "padding-right:8px;" : "padding-left:8px;"),
    );
    const row = cells.length === 2
        ? `${cells[0]}<td class="gap" width="4%" style="font-size:1px;line-height:1px;">&nbsp;</td>${cells[1]}`
        : cells[0];
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${row}</tr></table>`;
}

function forumCardTable(title: string, author: string, board: string, href: string): string {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f4ec" style="background-color:#f1f4ec; border-radius:14px;"><tr>
      <td style="padding:24px 26px;">
        <div style="font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#2F7D38;">Fresh from the forum</div>
        <p style="margin:10px 0 0 0; font-family:'Fraunces',Georgia,serif; font-style:italic; font-size:20px; line-height:29px; color:#1c2317;">&ldquo;${esc(title)}&rdquo;</p>
        <p style="margin:10px 0 0 0; font-family:'Hanken Grotesk',Helvetica,Arial,sans-serif; font-size:14px; color:#6b6f63;">— ${esc(author)} in ${esc(board)} · <a href="${href}" style="color:#225F27; font-weight:600; text-decoration:none;">join the thread →</a></p>
      </td>
    </tr></table>`;
}

/** The most recent forum thread (so every new member gets a fresh one). */
export async function latestThreadHtml(): Promise<string> {
    const t = await prisma.thread.findFirst({
        orderBy: { lastPostAt: "desc" },
        select: {
            slug: true,
            title: true,
            author: { select: { name: true, username: true } },
            forum: { select: { name: true, slug: true, category: { select: { slug: true } } } },
        },
    });
    if (!t) return "";
    const author = t.author?.name ?? t.author?.username ?? "a member";
    const board = t.forum?.name ?? "the forum";
    const cat = t.forum?.category?.slug ?? "general";
    const fslug = t.forum?.slug ?? "general";
    return forumCardTable(t.title, author, board, `${SITE}/forum/${cat}/${fslug}/${t.slug}`);
}

export async function resolveWelcomeDynamics(html: string): Promise<string> {
    let out = html;
    if (/\{\{\s*category_cards\s*\}\}/i.test(out)) {
        out = out.replace(/\{\{\s*category_cards\s*\}\}/gi, await categoryCardsHtml());
    }
    if (/\{\{\s*latest_thread\s*\}\}/i.test(out)) {
        out = out.replace(/\{\{\s*latest_thread\s*\}\}/gi, await latestThreadHtml());
    }
    return out;
}
