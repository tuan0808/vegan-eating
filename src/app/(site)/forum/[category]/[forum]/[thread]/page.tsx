// src/app/(site)/forum/[category]/[forum]/[thread]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getThreadView } from "@/lib/forum";
import { currentUser } from "@/lib/auth-helpers";
import ThreadView from "@/components/ThreadView";
import { createReply } from "../../../actions";
import { updatePost, deletePost, togglePin, toggleLock } from "../../../moderation-actions";

export const revalidate = 60;

export async function generateMetadata(
    { params }: { params: { category: string; forum: string; thread: string } }
): Promise<Metadata> {
    const view = await getThreadView(params.category, params.forum, params.thread);
    if (!view) return { title: "Thread — vegan eating" };
    return { title: `${view.title} — Forums — vegan eating` };
}

export default async function ThreadPage(
    { params }: { params: { category: string; forum: string; thread: string } }
) {
    const view = await getThreadView(params.category, params.forum, params.thread);
    if (!view) notFound();

    const user = await currentUser();

    return (
        <>
            <section className="recipe-hero">
                <div className="hero-bg">
                    <div className="ph p3" />
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(180deg, rgba(20,30,20,.35), rgba(20,30,20,.62))",
                        }}
                    />
                </div>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    <div style={{ fontSize: 13, marginBottom: 14, color: "rgba(255,255,255,.8)" }}>
                        <Link href="/forum" style={{ color: "rgba(255,255,255,.85)" }}>Forums</Link>
                        <span style={{ margin: "0 8px" }}>/</span>
                        <span>{view.category.name}</span>
                        <span style={{ margin: "0 8px" }}>/</span>
                        <Link
                            href={`/forum/${view.category.slug}/${view.forum.slug}`}
                            style={{ color: "rgba(255,255,255,.85)" }}
                        >
                            {view.forum.name}
                        </Link>
                    </div>
                    <h1 style={{ marginTop: 4, maxWidth: 760 }}>{view.title}</h1>
                    <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>
                        {view.posts.length} {view.posts.length === 1 ? "post" : "posts"} in {view.forum.name}
                    </p>
                </div>
            </section>

            <ThreadView
                view={view}
                loggedIn={!!user}
                currentUserId={user?.id ?? null}
                canModerate={user?.role === "ADMIN" || user?.role === "MODERATOR"}
                replyAction={createReply}
                editAction={updatePost}
                deleteAction={deletePost}
                pinAction={togglePin}
                lockAction={toggleLock}
                categorySlug={view.category.slug}
                forumSlug={view.forum.slug}
                threadSlug={params.thread}
            />
        </>
    );
}