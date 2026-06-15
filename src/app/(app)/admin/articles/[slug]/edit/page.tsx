// src/app/(app)/admin/articles/[slug]/edit/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { updateArticle } from "./actions";
import { ARTICLE_CATEGORIES } from "@/lib/categories";
import ArticleImagesField from "./ArticleImagesField";
import "../../../recipes/admin-recipes.css";

export const dynamic = "force-dynamic";

// JSON array of paragraphs -> textarea text (blank line between paragraphs).
function toBodyText(json: string | null | undefined): string {
    if (!json) return "";
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.join("\n\n") : "";
    } catch {
        return "";
    }
}

// JSON array of tags -> comma-separated text.
function toTagsText(json: string | null | undefined): string {
    if (!json) return "";
    try {
        const v = JSON.parse(json);
        return Array.isArray(v) ? v.join(", ") : "";
    } catch {
        return "";
    }
}

export default async function EditArticlePage({
                                                  params,
                                                  searchParams,
                                              }: {
    params: { slug: string };
    searchParams: { saved?: string };
}) {
    const user = await requireUser();
    if (user.role !== "ADMIN") redirect("/dashboard");

    const article = await prisma.article.findUnique({ where: { slug: params.slug } });
    if (!article) notFound();

    const saved = searchParams?.saved === "1";

    const gallery = (() => { try { const v = JSON.parse(article.gallery || "[]"); return Array.isArray(v) ? (v as string[]) : []; } catch { return []; } })();
    const initialImages = [article.image, ...gallery].filter((s): s is string => !!s && s.trim() !== "");

    return (
        <div className="admin-recipes">
            <div className="ar-topline">
                <Link href="/admin/articles" className="ar-back">← All articles</Link>
                <Link href={`/articles/${article.slug}`} className="ar-viewlink" target="_blank">View on site ↗</Link>
            </div>

            <div className="ar-head">
                <span className="ar-kicker">Editing article</span>
                <h1 className="ar-title">{article.title}</h1>
                <code className="ar-slug">/{article.slug}</code>
            </div>

            {saved && (
                <div className="ar-banner" role="status">Saved. Your changes are live on the article page.</div>
            )}

            <form action={updateArticle} className="ar-form">
                <input type="hidden" name="slug" value={article.slug} />

                <fieldset className="ar-card">
                    <legend>Basics</legend>

                    <label className="ar-field">
                        <span>Title</span>
                        <input name="title" defaultValue={article.title} required />
                    </label>

                    <label className="ar-field">
                        <span>Date</span>
                        <input name="date" defaultValue={article.date} />
                    </label>

                    <ArticleImagesField name="images" initial={initialImages} />

                    <label className="ar-field">
                        <span>Source URL</span>
                        <input name="sourceUrl" defaultValue={article.sourceUrl} />
                    </label>

                    <label className="ar-field">
                        <span>Category</span>
                        <select name="category" defaultValue={article.category ?? ""}>
                            <option value="">— None —</option>
                            {ARTICLE_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="ar-field">
                        <span>Tags <em>(comma-separated)</em></span>
                        <input name="tags" defaultValue={toTagsText(article.tags)} placeholder="air fryer, instant pot, sous-vide" />
                    </label>

                    <label className="ar-check">
                        <input type="checkbox" name="hidden" defaultChecked={article.hidden} />
                        <span>Hidden (kept in the library, removed from the public site)</span>
                    </label>
                </fieldset>

                <fieldset className="ar-card">
                    <legend>Body</legend>
                    <p className="ar-hint">One paragraph per block — separate paragraphs with a blank line.</p>
                    <label className="ar-field">
                        <textarea name="body" rows={20} defaultValue={toBodyText(article.body)} aria-label="Article body" />
                    </label>
                </fieldset>

                <div className="ar-actions">
                    <button type="submit" className="ar-save">Save changes</button>
                    <Link href="/admin/articles" className="ar-cancel">Cancel</Link>
                </div>
            </form>
        </div>
    );
}