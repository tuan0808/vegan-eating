// src/lib/slash-command.tsx
"use client";

import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance } from "tippy.js";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

type Cmd = {
    title: string;
    subtitle: string;
    icon: string;
    run: (props: { editor: any; range: any }) => void;
};

// Only blocks that ArticleBody renders — keep editor and renderer in lockstep.
const COMMANDS: Cmd[] = [
    { title: "Text", subtitle: "Plain paragraph", icon: "¶",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
    { title: "Heading 2", subtitle: "Section title", icon: "H2",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run() },
    { title: "Heading 3", subtitle: "Sub-section", icon: "H3",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run() },
    { title: "Bullet List", subtitle: "Unordered list", icon: "•",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
    { title: "Numbered List", subtitle: "Ordered list", icon: "1.",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
    { title: "Quote", subtitle: "Pull a line out", icon: "❝",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
    { title: "Table", subtitle: "3×3 with header row", icon: "▦",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { title: "Task List", subtitle: "Checklist", icon: "☑",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
    { title: "Code", subtitle: "Code block", icon: "</>",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
    { title: "Toggle", subtitle: "Collapsible details", icon: "▸",
        run: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertContent({
            type: "details",
            content: [
                { type: "detailsSummary", content: [{ type: "text", text: "Summary" }] },
                { type: "detailsContent", content: [{ type: "paragraph" }] },
            ],
        }).run() },
    { title: "YouTube", subtitle: "Embed a video", icon: "▶",
        run: ({ editor, range }) => {
            const url = window.prompt("YouTube URL");
            const chain = editor.chain().focus().deleteRange(range);
            if (url) chain.setYoutubeVideo({ src: url }).run();
            else chain.run();
        } },
];

const List = forwardRef(function List(
    { items, command }: { items: Cmd[]; command: (c: Cmd) => void },
    ref
) {
    const [sel, setSel] = useState(0);
    useEffect(() => setSel(0), [items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (!items.length) return false;
            if (event.key === "ArrowUp") { setSel((s) => (s + items.length - 1) % items.length); return true; }
            if (event.key === "ArrowDown") { setSel((s) => (s + 1) % items.length); return true; }
            if (event.key === "Enter") { if (items[sel]) command(items[sel]); return true; }
            return false;
        },
    }));

    if (!items.length) return <div className="slash-menu"><div className="slash-empty">No matches</div></div>;
    return (
        <div className="slash-menu">
            {items.map((it, i) => (
                <button
                    type="button"
                    key={it.title}
                    className={"slash-item" + (i === sel ? " is-sel" : "")}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => command(it)}
                >
                    <span className="slash-ico">{it.icon}</span>
                    <span className="slash-text">
                        <span className="slash-title">{it.title}</span>
                        <span className="slash-sub">{it.subtitle}</span>
                    </span>
                </button>
            ))}
        </div>
    );
});

export const SlashCommand = Extension.create({
    name: "slashCommand",
    addOptions() {
        return {
            suggestion: {
                char: "/",
                startOfLine: false,
                command: ({ editor, range, props }: any) => props.run({ editor, range }),
            },
        };
    },
    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
                items: ({ query }: { query: string }) =>
                    COMMANDS.filter((c) => c.title.toLowerCase().includes(query.toLowerCase())),
                render: () => {
                    let component: ReactRenderer | null = null;
                    let popup: Instance[] = [];
                    return {
                        onStart: (props: any) => {
                            component = new ReactRenderer(List, {
                                props: { items: props.items, command: (c: Cmd) => props.command(c) },
                                editor: props.editor,
                            });
                            if (!props.clientRect) return;
                            popup = tippy("body", {
                                getReferenceClientRect: props.clientRect,
                                appendTo: () => document.body,
                                content: component.element,
                                showOnCreate: true,
                                interactive: true,
                                trigger: "manual",
                                placement: "bottom-start",
                            });
                        },
                        onUpdate: (props: any) => {
                            component?.updateProps({ items: props.items, command: (c: Cmd) => props.command(c) });
                            if (props.clientRect) popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
                        },
                        onKeyDown: (props: any) => {
                            if (props.event.key === "Escape") { popup[0]?.hide(); return true; }
                            return (component?.ref as any)?.onKeyDown(props) ?? false;
                        },
                        onExit: () => {
                            popup[0]?.destroy();
                            component?.destroy();
                        },
                    };
                },
            }),
        ];
    },
});