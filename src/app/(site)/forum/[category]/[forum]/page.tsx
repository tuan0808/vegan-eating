// src/app/(site)/forum/[category]/[forum]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getForumView } from "@/lib/forum";
import { currentUser } from "@/lib/auth-helpers";
import ThreadList from "@/components/ThreadList";

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
            <section className="recipe-hero">
                <div className="hero-bg">
                    <div className="ph p3" />
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(180deg, rgba(20,30,20,.35), rgba(20,30,20,.60))",
                        }}
                    />
                </div>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    <div style={{ fontSize: 13, marginBottom: 14, color: "rgba(255,255,255,.8)" }}>
                        <Link href="/forum" style={{ color: "rgba(255,255,255,.85)" }}>Forums</Link>
                        <span style={{ margin: "0 8px" }}>/</span>
                        <span>{view.category.name}</span>
                    </div>
                    <span className="kicker" style={{ color: "#A7D98C" }}>{view.category.name}</span>
                    <h1 style={{ marginTop: 12, maxWidth: 760 }}>{view.forum.name}</h1>
                    {view.forum.description ? (
                        <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>{view.forum.description}</p>
                    ) : null}

                    <div style={{ marginTop: 18 }}>
                        {user ? (
                            <Link
                                href={newHref}
                                style={{
                                    display: "inline-block",
                                    background: "#fff",
                                    color: "var(--ink, #1c2317)",
                                    borderRadius: 999,
                                    padding: "11px 22px",
                                    fontSize: 14.5,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                }}
                            >
                                + Start a thread
                            </Link>
                        ) : (
                            <Link
                                href="/login"
                                style={{
                                    display: "inline-block",
                                    border: "1px solid rgba(255,255,255,.55)",
                                    color: "#fff",
                                    borderRadius: 999,
                                    padding: "11px 22px",
                                    fontSize: 14.5,
                                    fontWeight: 600,
                                    textDecoration: "none",
                                }}
                            >
                                Log in to start a thread
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            <ThreadList
                threads={view.threads}
                accent={view.accent}
                categorySlug={view.category.slug}
                forumSlug={view.forum.slug}
            />
        </>
    );
}