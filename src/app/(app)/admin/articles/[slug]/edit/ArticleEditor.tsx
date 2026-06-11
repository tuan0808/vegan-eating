// src/app/(app)/admin/articles/[slug]/edit/ArticleEditor.tsx
"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { articleExtensions } from "@/lib/tiptap-extensions";
import type { TiptapDoc } from "@/lib/article-body";
import "./article-editor.css";

export default function ArticleEditor({ name, initial }: { name: string; initial: TiptapDoc }) {
    const [json, setJson] = useState(() => JSON.stringify(initial));
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: articleExtensions,
        content: initial,
        immediatelyRender: false, // required in Next App Router to avoid a hydration mismatch
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

    const upload = async (files: FileList | null) => {
        if (!files?.length) return;
        setUploading(true);
        try {
            for (const f of Array.from(files)) {
                const fd = new FormData();
                fd.append("file", f);
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.path) editor.chain().focus().setImage({ src: data.path }).run();
            }
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    const align = (a: "full" | "left" | "right") => editor.chain().focus().updateAttributes("image", { align: a }).run();
    const cls = (on: boolean) => "ae-btn" + (on ? " is-on" : "");
    const imgOn = editor.isActive("image");
    const curAlign = editor.getAttributes("image").align;

    return (
        <div className="ae">
            <input type="hidden" name={name} value={json} />
            <div className="ae-toolbar">
                <button type="button" className={cls(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
                <button type="button" className={cls(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
                <span className="ae-sep" />
                <button type="button" className={cls(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
                <button type="button" className={cls(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
                <button type="button" className={cls(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝ Quote</button>
                <button type="button" className={cls(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
                <button type="button" className={cls(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
                <span className="ae-sep" />
                <button type="button" className={cls(editor.isActive("link"))} onClick={addLink}>Link</button>
                <button type="button" className="ae-btn" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading…" : "Image"}</button>
                {imgOn && (
                    <>
                        <span className="ae-sep" />
                        <span className="ae-lbl">Image:</span>
                        <button type="button" className={cls(curAlign === "left")} onClick={() => align("left")}>Left</button>
                        <button type="button" className={cls(curAlign === "full")} onClick={() => align("full")}>Full</button>
                        <button type="button" className={cls(curAlign === "right")} onClick={() => align("right")}>Right</button>
                    </>
                )}
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}