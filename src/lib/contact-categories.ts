// src/lib/contact-categories.ts
// Shared, dependency-free so both the client form and server code can import it
// (importing from lib/contact.ts into a client component would pull in Prisma).
export type ContactCategory = "GENERAL" | "SUPPORT" | "RECIPES";

export const CONTACT_CATEGORIES: { value: ContactCategory; label: string }[] = [
    { value: "GENERAL", label: "General inquiry" },
    { value: "SUPPORT", label: "Site issue / support" },
    { value: "RECIPES", label: "Recipes" },
];

export const categoryLabel = (v: string): string =>
    CONTACT_CATEGORIES.find((c) => c.value === v)?.label ?? "General inquiry";