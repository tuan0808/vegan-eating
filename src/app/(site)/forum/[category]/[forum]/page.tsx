// src/app/(site)/forum/[category]/[forum]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getForumView } from "@/lib/forum";
import { currentUser } from "@/lib/auth-helpers";
import ThreadList from "@/components/ThreadList";
import PageHero from "@/components/PageHero";
import { canPostInBoard, postGateNotice } from "@/lib/forum-perms";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata(
    { params: paramsP }: { params: Promise<{ category: string; forum: string }> }
): Promise<Metadata> {
    const params = await paramsP;
    const view = await getForumView(params.category, params.forum);
    if (!view) return { title: "Forum — vegan eating" };
    return {
        title: `${view.forum.name} — Forums — vegan eating`,
        description: view.forum.description ?? undefined,
    };
}

export default async function ForumViewPage(
    { params: paramsP }: { params: Promise<{ category: string; forum: string }> }
) {
    const params = await paramsP;
    const view = await getForumView(params.category, params.forum);
    if (!view) notFound();

    const user = await currentUser();
    const newHref = `/forum/${view.category.slug}/${view.forum.slug}/new`;
    // Signed-in members who can't start a thread here get a notice instead of the button.
    const gate = user?.id ? await canPostInBoard({ id: user.id, role: user.role }, view.forum) : null;
    const notice = gate ? postGateNotice(gate) : null;
    const canStart = !user || !!gate?.ok;

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
                    !user
                        ? { label: "Log in to start a thread", href: "/login" }
                        : canStart
                            ? { label: "+ Start a thread", href: newHref }
                            : undefined
                }
            />

            <ThreadList
                threads={view.threads}
                accent={view.accent}
                categorySlug={view.category.slug}
                forumSlug={view.forum.slug}
                newHref={!user ? "/login" : canStart ? newHref : null}
                notice={notice}
            />
        </>
    );
}