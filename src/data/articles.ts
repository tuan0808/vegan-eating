// src/data/articles.ts
// Type only. Data comes from the database (see src/lib/articles.ts).
import type { TiptapDoc } from "@/lib/article-body";

export type Article = {
    id?: number;
    slug: string;
    title: string;
    sourceUrl: string;
    date: string;
    image: string | null;
    hidden: boolean;
    body: TiptapDoc;
    tags: string[];
    category: string;
    gallery: string[];
    views: number;
};