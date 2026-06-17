// src/app/(site)/articles/[slug]/ArticleBody.tsx
import { Fragment, type ReactNode } from "react";
import ArticleFigure from "./ArticleFigure";
import type { TiptapDoc, BodyNode, TextNode } from "@/lib/article-body";

export const dynamic = "force-dynamic";
function imgSrc(src: string): string {
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return "/" + src.replace(/^\.?\//, "");
}

// Block javascript:/data: and other unsafe link targets.
function safeHref(href: string): string {
    return /^(https?:|mailto:|\/|#)/i.test(href.trim()) ? href : "#";
}

// Normalise any YouTube URL to its embed form.
function ytEmbed(src: string): string {
    try {
        const u = new URL(src);
        let id = "";
        if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
        else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/embed/")[1];
        else id = u.searchParams.get("v") || "";
        id = (id || "").split(/[?&/]/)[0];
        return id ? `https://www.youtube.com/embed/${id}` : src;
    } catch {
        return src;
    }
}

function inline(nodes?: TextNode[]) {
    if (!nodes) return null;
    return nodes.map((n, i) => {
        let el: ReactNode = n.text;
        for (const m of n.marks ?? []) {
            if (m.type === "bold") el = <strong>{el}</strong>;
            else if (m.type === "italic") el = <em>{el}</em>;
            else if (m.type === "link") el = <a href={safeHref(m.attrs.href)} rel="noopener noreferrer">{el}</a>;
        }
        return <Fragment key={i}>{el}</Fragment>;
    });
}

function block(node: BodyNode, key: number, isLead: boolean): ReactNode {
    switch (node.type) {
        case "paragraph": {
            const first = node.content?.[0];
            if (isLead && first?.type === "text" && first.text) {
                const rest = [{ ...first, text: first.text.slice(1) }, ...(node.content ?? []).slice(1)];
                return (
                    <p key={key} className="art-lead">
                        <span className="art-dropcap">{first.text.charAt(0)}</span>
                        {inline(rest)}
                    </p>
                );
            }
            return <p key={key} className="art-p">{inline(node.content)}</p>;
        }
        case "heading": {
            const lvl = node.attrs?.level ?? 2;
            return lvl <= 2
                ? <h2 key={key} className="art-h2">{inline(node.content)}</h2>
                : <h3 key={key} className="art-h3">{inline(node.content)}</h3>;
        }
        case "blockquote":
            return (
                <blockquote key={key} className="art-quote">
                    {node.content?.map((c) => inline((c as { content?: TextNode[] }).content))}
                </blockquote>
            );
        case "bulletList":
            return <ul key={key} className="art-list">{node.content?.map((li, i) => block(li, i, false))}</ul>;
        case "orderedList":
            return <ol key={key} className="art-list">{node.content?.map((li, i) => block(li, i, false))}</ol>;
        case "listItem":
            return <li key={key}>{node.content?.map((c) => inline((c as { content?: TextNode[] }).content))}</li>;
        case "image": {
            const align = node.attrs.align ?? "full";
            const cls = align === "full" ? "art-img art-full" : `art-img art-float-${align}`;
            const sizes = align === "full" ? "(max-width:1024px) 90vw, 680px" : "(max-width:640px) 90vw, 360px";
            return <ArticleFigure key={key} src={imgSrc(node.attrs.src)} className={cls} sizes={sizes} />;
        }
        case "table":
            return (
                <div key={key} className="art-tablewrap">
                    <table className="art-table"><tbody>{node.content?.map((r, i) => block(r, i, false))}</tbody></table>
                </div>
            );
        case "tableRow":
            return <tr key={key}>{node.content?.map((c, i) => block(c, i, false))}</tr>;
        case "tableHeader":
            return <th key={key} colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan}>{node.content?.map((c, i) => block(c, i, false))}</th>;
        case "tableCell":
            return <td key={key} colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan}>{node.content?.map((c, i) => block(c, i, false))}</td>;
        case "taskList":
            return <ul key={key} className="art-tasklist">{node.content?.map((it, i) => block(it, i, false))}</ul>;
        case "taskItem":
            return (
                <li key={key} className="art-task" data-checked={node.attrs?.checked ? "true" : "false"}>
                    <input type="checkbox" checked={!!node.attrs?.checked} disabled />
                    <div className="art-task-body">{node.content?.map((c, i) => block(c, i, false))}</div>
                </li>
            );
        case "youtube":
            return (
                <div key={key} className="art-embed">
                    <iframe
                        src={ytEmbed(node.attrs.src)}
                        title="Embedded video"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        case "codeBlock": {
            const code = (node.content ?? []).map((c) => (c as { text?: string }).text ?? "").join("");
            const lang = node.attrs?.language;
            return (
                <pre key={key} className="art-code">
                    <code className={lang ? `language-${lang}` : undefined}>{code}</code>
                </pre>
            );
        }
        case "details":
            return (
                <details key={key} className="art-details" open={!!node.attrs?.open}>
                    {node.content?.map((c, i) => block(c, i, false))}
                </details>
            );
        case "detailsSummary":
            return <summary key={key} className="art-summary">{inline(node.content)}</summary>;
        case "detailsContent":
            return <div key={key} className="art-details-body">{node.content?.map((c, i) => block(c, i, false))}</div>;
        default:
            return null;
    }
}

export default function ArticleBody({ doc, lead = true }: { doc: TiptapDoc; lead?: boolean }) {
    const blocks = doc?.content ?? [];
    const leadIdx = lead ? blocks.findIndex((b) => b.type === "paragraph") : -1;
    return <div className="article-body">{blocks.map((n, i) => block(n, i, i === leadIdx))}</div>;
}