// src/app/(app)/admin/recipes/[slug]/edit/DescriptionEditor.tsx
"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import type { TiptapDoc } from "@/lib/article-body";

// Intentionally light: text formatting only. No image/table/embed nodes, so a
// recipe description can never produce a full-width lightboxed figure.
const descriptionExtensions = [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] }),
];

export default function DescriptionEditor({ name, initial }: { name: string; initial: TiptapDoc }) {
    const [json, setJson] = useState(() => JSON.stringify(initial));

    const editor = useEditor({
        extensions: descriptionExtensions,
        content: initial,
        immediatelyRender: false, // required in Next App Router to avoid hydration mismatch
        editorProps: { attributes: { class: "ae-content" } },
        onUpdate: ({ editor }) => setJson(JSON.stringify(editor.getJSON())),
    });
    if (!editor) return null;

    const addLink = () => {
        const url = window.prompt("Link URL", editor.getAttributes("link").href || "https://");
        if (url === null) return;
        if (url === "") return void editor.chain().focus().unsetLink().run();
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    };
    const cls = (on: boolean) => "ae-btn" + (on ? " is-on" : "");

    return (
        <div className="ae ae--compact">
            <input type="hidden" name={name} value={json} />
            <div className="ae-toolbar">
                <button type="button" className={cls(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
                <button type="button" className={cls(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
                <span className="ae-sep" />
                <button type="button" className={cls(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
                <button type="button" className={cls(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
                <button type="button" className={cls(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
                <button type="button" className={cls(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
                <button type="button" className={cls(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</button>
                <span className="ae-sep" />
                <button type="button" className={cls(editor.isActive("link"))} onClick={addLink}>Link</button>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}