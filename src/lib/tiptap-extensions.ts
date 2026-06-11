// src/lib/tiptap-extensions.ts
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Youtube from "@tiptap/extension-youtube";
import Details from "@tiptap/extension-details";
import DetailsSummary from "@tiptap/extension-details-summary";
import DetailsContent from "@tiptap/extension-details-content";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import { SlashCommand } from "./slash-command";

// Image node extended with an `align` attribute so authors control placement
// (full | left | right) — the renderer reads this and applies the float classes.
export const ArticleImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            align: {
                default: "full",
                parseHTML: (el) => el.getAttribute("data-align") || "full",
                renderHTML: (attrs) => ({ "data-align": attrs.align }),
            },
        };
    },
});

export const articleExtensions = [
    StarterKit.configure({
        heading: { levels: [2, 3] }, // H1 is the page title; codeBlock stays on (from StarterKit)
    }),
    Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] }),
    ArticleImage.configure({ inline: false, allowBase64: false }),

    // Batch 1 content types
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    Youtube.configure({ controls: true }),

    // Batch 2 content types — collapsible toggles (code block comes from StarterKit)
    Details.configure({ persist: true }),
    DetailsSummary,
    DetailsContent,

    SlashCommand, // "/" opens the insert menu
    GlobalDragHandle.configure({ dragHandleWidth: 20, scrollTreshold: 100 }), // hover-grip to reorder blocks
];