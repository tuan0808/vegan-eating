// src/data/articles.ts
// Type only. Data comes from the database (see src/lib/articles.ts).

export type Article = {
    id?: number;
    slug: string;
    title: string;
    sourceUrl: string;
    date: string;
    image: string | null;
    hidden: boolean;
    body: string[];
    tags: string[];
    category: string;
    gallery: string[];

};