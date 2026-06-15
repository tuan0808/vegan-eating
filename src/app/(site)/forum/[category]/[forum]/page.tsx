// src/app/(site)/forum/[category]/[forum]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getForumView } from "@/lib/forum";
import { currentUser } from "@/lib/auth-helpers";
import ThreadList from "@/components/ThreadList";
import PageHero from "@/components/PageHero";

export const revalidate = 60;

export async function generateMetadata(
    { params }: { params: { category: string; forum: string } }
): Promise<Metadata> {
    const view = await getForumView(params.category, params.forum);
    if (!view) return { title: "Forum — vegan eating" };
    return {
        title: `${view.forum.name} — Forums — vegan eating`,
        description: view.forum.description ?? undefined,
    };
}

export default async function ForumViewPage(
    { params }: { params: { category: string; forum: string } }
) {
    const view = await getForumView(params.category, params.forum);
    if (!view) notFound();

    const user = await currentUser();
    const newHref = `/forum/${view.category.slug}/${view.forum.slug}/new`;

    return (
        <>
            <PageHero
                image="/header/forum.jpg"
                breadcrumb={
                    <>
                        <Link href="/forum" style={{ color: "rgba(255,255,255,.85)" }}>Forums</Link>
                        <span style={{ margin: "0 8px" }}>/</span>
                        <span>{view.category.name}</span>
                    </>
                }
                kicker={view.category.name}
                title={view.forum.name}
                dek={view.forum.description ?? undefined}
                cta={
                    user
                        ? { label: "+ Start a thread", href: newHref }
                        : { label: "Log in to start a thread", href: "/login" }
                }
            />

            <ThreadList
                threads={view.threads}
                accent={view.accent}
                categorySlug={view.category.slug}
                forumSlug={view.forum.slug}
            />
        </>
    );
}