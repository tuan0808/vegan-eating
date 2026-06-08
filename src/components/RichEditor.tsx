// src/components/RichEditor.tsx
"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

/**
 * A small WYSIWYG editor. It keeps its HTML in state and mirrors it into a
 * hidden <input name={name}>, so it drops straight into a normal <form action={…}>
 * and the server action receives `body` as HTML — which the action then sanitises
 * before storing. Never trust this HTML on its own; the cleaning happens server-side.
 */
export default function RichEditor({
                                       name = "body",
                                       placeholder = "Write…",
                                       defaultValue = "",
                                   }: {
    name?: string;
    placeholder?: string;
    defaultValue?: string;
}) {
    const [html, setHtml] = useState(defaultValue);

    const editor = useEditor({
        immediatelyRender: false, // required under Next's SSR or you get hydration errors
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] } }),
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                HTMLAttributes: { rel: "nofollow noopener", target: "_blank" },
            }),
            Placeholder.configure({ placeholder }),
        ],
        content: defaultValue,
        onUpdate: ({ editor }) => setHtml(editor.isEmpty ? "" : editor.getHTML()),
    });

    if (!editor) return <div className="rte rte-skeleton" />;

    const setLink = () => {
        const prev = editor.getAttributes("link").href as string | undefined;
        const url = window.prompt("Link URL", prev ?? "https://");
        if (url === null) return; // cancelled
        if (url.trim() === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    };

    const icon = {
        bullet: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="2.5" cy="4" r="1" fill="currentColor" stroke="none" />
                <circle cx="2.5" cy="8" r="1" fill="currentColor" stroke="none" />
                <circle cx="2.5" cy="12" r="1" fill="currentColor" stroke="none" />
                <line x1="6" y1="4" x2="14" y2="4" /><line x1="6" y1="8" x2="14" y2="8" /><line x1="6" y1="12" x2="14" y2="12" />
            </svg>
        ),
        ordered: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <line x1="6" y1="4" x2="14" y2="4" /><line x1="6" y1="8" x2="14" y2="8" /><line x1="6" y1="12" x2="14" y2="12" />
                <text x="1" y="6" fontSize="6" fill="currentColor" stroke="none">1</text>
                <text x="1" y="14" fontSize="6" fill="currentColor" stroke="none">2</text>
            </svg>
        ),
        quote: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 4h4v4H4.5c0 1.4.6 2 2 2v2c-2.6 0-3.5-1.6-3.5-4V4zm6 0h4v4h-2.5c0 1.4.6 2 2 2v2c-2.6 0-3.5-1.6-3.5-4V4z" />
            </svg>
        ),
        code: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="5,4 1.5,8 5,12" /><polyline points="11,4 14.5,8 11,12" />
            </svg>
        ),
        link: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 9.5l3-3M7 5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11l-1 1A2.5 2.5 0 014.5 8.5l1-1" />
            </svg>
        ),
        undo: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h7a3 3 0 010 6H7" /><polyline points="5.5,5 3,8 5.5,11" />
            </svg>
        ),
        redo: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 8H6a3 3 0 000 6h3" /><polyline points="10.5,5 13,8 10.5,11" />
            </svg>
        ),
    };

    const buttons: Array<
        | { type: "sep" }
        | { label: React.ReactNode; title: string; active?: boolean; disabled?: boolean; onClick: () => void; cls?: string }
    > = [
        { label: "B", title: "Bold", cls: "g-bold", active: editor.isActive("bold"), onClick: () => editor.chain().focus().toggleBold().run() },
        { label: "I", title: "Italic", cls: "g-italic", active: editor.isActive("italic"), onClick: () => editor.chain().focus().toggleItalic().run() },
        { label: "U", title: "Underline", cls: "g-underline", active: editor.isActive("underline"), onClick: () => editor.chain().focus().toggleUnderline().run() },
        { label: "S", title: "Strikethrough", cls: "g-strike", active: editor.isActive("strike"), onClick: () => editor.chain().focus().toggleStrike().run() },
        { type: "sep" },
        { label: "H2", title: "Heading", active: editor.isActive("heading", { level: 2 }), onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: "H3", title: "Subheading", active: editor.isActive("heading", { level: 3 }), onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
        { type: "sep" },
        { label: icon.bullet, title: "Bullet list", active: editor.isActive("bulletList"), onClick: () => editor.chain().focus().toggleBulletList().run() },
        { label: icon.ordered, title: "Numbered list", active: editor.isActive("orderedList"), onClick: () => editor.chain().focus().toggleOrderedList().run() },
        { label: icon.quote, title: "Quote", active: editor.isActive("blockquote"), onClick: () => editor.chain().focus().toggleBlockquote().run() },
        { label: icon.code, title: "Code block", active: editor.isActive("codeBlock"), onClick: () => editor.chain().focus().toggleCodeBlock().run() },
        { label: icon.link, title: "Link", active: editor.isActive("link"), onClick: setLink },
        { type: "sep" },
        { label: icon.undo, title: "Undo", disabled: !editor.can().undo(), onClick: () => editor.chain().focus().undo().run() },
        { label: icon.redo, title: "Redo", disabled: !editor.can().redo(), onClick: () => editor.chain().focus().redo().run() },
    ];

    return (
        <div className="rte">
            <input type="hidden" name={name} value={html} />

            <div className="tb">
                {buttons.map((b, i) =>
                    "type" in b ? (
                        <span key={i} className="sep" aria-hidden />
                    ) : (
                        <button
                            key={i}
                            type="button"
                            title={b.title}
                            aria-label={b.title}
                            disabled={b.disabled}
                            data-active={b.active ? "1" : undefined}
                            className={`tb-btn ${b.cls ?? ""}`}
                            onClick={b.onClick}
                        >
                            {b.label}
                        </button>
                    )
                )}
            </div>

            <EditorContent editor={editor} className="rte-area" />

            <style jsx>{`
        .rte {
          border: 1px solid var(--line, #e6e3da);
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
        }
        .rte-skeleton {
          min-height: 200px;
          background: #faf8f1;
        }
        .tb {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2px;
          padding: 7px 9px;
          background: #f4f1e8;
          border-bottom: 1px solid var(--line, #e6e3da);
        }
        .tb-btn {
          min-width: 30px;
          height: 30px;
          padding: 0 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          border-radius: 7px;
          color: var(--ink, #2a2f24);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .tb-btn:hover {
          background: rgba(0, 0, 0, 0.06);
        }
        .tb-btn[data-active="1"] {
          background: var(--terra, #c2603a);
          color: #fff;
        }
        .tb-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .g-bold { font-weight: 800; }
        .g-italic { font-style: italic; font-family: var(--display, "Fraunces", serif); }
        .g-underline { text-decoration: underline; }
        .g-strike { text-decoration: line-through; }
        .sep {
          width: 1px;
          height: 18px;
          margin: 0 5px;
          background: var(--line, #ddd9cd);
        }

        /* The ProseMirror surface is rendered by Tiptap, so its classes need :global */
        .rte :global(.rte-area) {
          padding: 0;
        }
        .rte :global(.ProseMirror) {
          min-height: 160px;
          padding: 14px 16px;
          outline: none;
          font-size: 15.5px;
          line-height: 1.7;
          color: var(--ink, #1c2317);
        }
        .rte :global(.ProseMirror p) {
          margin: 0 0 0.7em;
        }
        .rte :global(.ProseMirror p:last-child) {
          margin-bottom: 0;
        }
        .rte :global(.ProseMirror h2) {
          font-family: var(--display, "Fraunces", serif);
          font-size: 22px;
          margin: 0.4em 0 0.3em;
        }
        .rte :global(.ProseMirror h3) {
          font-family: var(--display, "Fraunces", serif);
          font-size: 18px;
          margin: 0.4em 0 0.3em;
        }
        .rte :global(.ProseMirror ul),
        .rte :global(.ProseMirror ol) {
          padding-left: 1.4em;
          margin: 0 0 0.7em;
        }
        .rte :global(.ProseMirror blockquote) {
          border-left: 3px solid var(--terra, #c2603a);
          margin: 0 0 0.7em;
          padding: 2px 0 2px 14px;
          color: var(--muted, #555);
        }
        .rte :global(.ProseMirror pre) {
          background: #2a2f24;
          color: #f4f1e8;
          border-radius: 8px;
          padding: 12px 14px;
          font-size: 13.5px;
          overflow-x: auto;
        }
        .rte :global(.ProseMirror code) {
          font-size: 0.92em;
        }
        .rte :global(.ProseMirror a) {
          color: var(--terra, #c2603a);
          text-decoration: underline;
        }
        /* placeholder text on an empty editor */
        .rte :global(.ProseMirror p.is-editor-empty:first-child::before) {
          content: attr(data-placeholder);
          color: var(--muted, #9a9789);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
        </div>
    );
}