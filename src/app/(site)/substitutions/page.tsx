// src/app/(site)/substitutions/page.tsx
import { prisma } from "@/lib/prisma";
import { titleCase } from "@/data/recipes";
import type { Sub } from "@/lib/subs";
import PageHero from "@/components/PageHero";
import SubstitutionsBrowser from "@/components/SubstitutionsBrowser";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
    title: "Ingredient substitutions",
    description:
        "A searchable glossary of vegan ingredient substitutions. Out of something? Type an ingredient to find what to swap it for.",
    path: "/substitutions",
});

function safeArr<T>(s: string | null | undefined): T[] {
    try {
        const v = JSON.parse(s || "[]");
        return Array.isArray(v) ? (v as T[]) : [];
    } catch {
        return [];
    }
}

export default async function SubstitutionsPage() {
    const raw = await prisma.ingredientSub.findMany({
        select: { name: true, aliases: true, subs: true, vegan: true },
        orderBy: { name: "asc" },
    });

    // Only ingredients that actually carry swaps; serialise the JSON columns.
    const items = raw
        .map((r) => ({
            name: r.name,
            label: titleCase(r.name),
            aliases: safeArr<string>(r.aliases),
            subs: safeArr<Sub>(r.subs).filter((s) => s && s.name),
            vegan: r.vegan,
        }))
        .filter((it) => it.subs.length > 0);

    return (
        <>
            <PageHero
                image="/header/recipes.jpg"
                kicker="The Kitchen"
                title="Ingredient substitutions"
                dek="Out of something? Search our glossary of vegan swaps — type an ingredient to find what to use instead."
            />
            <SubstitutionsBrowser items={items} />
        </>
    );
}
