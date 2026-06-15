// src/app/(site)/u/[username]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import { publicProfile, threadHref } from "@/lib/community";
import "@/styles/community.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
                                           params,
                                       }: {
    params: { username: string };
}): Promise<Metadata> {
    return { title: `${params.username} — vegan eating` };
}

function monogram(name: string | null, username: string) {
    return (name ?? username).trim().charAt(0).toUpperCase() || "?";
}

function memberSince(d: Date) {
    return new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export default async function PublicProfilePage({
                                                    params,
                                                }: {
    params: { username: string };
}) {
    const data = await publicProfile(params.username);
    if (!data || data.user.banned) notFound();

    const { user, threadCount, postCount, recentThreads } = data;
    const me = await currentUser();
    const isSelf = me?.id === user.id;

    return (
        // padding-top clears the fixed site header; the soft band keeps the
        // transparent nav legible on this otherwise light page.
        <div style={{ paddingTop: 120, paddingBottom: 60, background: "#f7f4ec", minHeight: "60vh" }}>
            <div className="cm" style={{ margin: "0 auto", padding: "0 20px" }}>
                <div className="cm-phead">
                    {user.avatarUrl ? (
                        <img className="cm-av big-av" src={user.avatarUrl} alt="" />
                    ) : (
                        <div className="cm-mono big-av">{monogram(user.name, user.username)}</div>
                    )}
                    <div>
                        <h1>{user.name ?? user.username}</h1>
                        <p className="since">
                            @{user.username}
                            {user.role !== "MEMBER" && <span className="cm-pill" style={{ marginLeft: 10 }}>{user.role}</span>}
                        </p>
                        <p className="since">Member since {memberSince(user.createdAt)}</p>
                    </div>
                </div>

                {user.bio && (
                    <p className="cm-sub" style={{ marginTop: 18, maxWidth: 620 }}>
                        {user.bio}
                    </p>
                )}

                <div className="cm-row">
                    {user.location && <span style={{ color: "var(--muted,#6b7264)" }}>📍 {user.location}</span>}
                    {user.website && (
                        <a href={user.website} target="_blank" rel="noopener noreferrer nofollow">
                            {user.website.replace(/^https?:\/\//, "")}
                        </a>
                    )}
                    {!isSelf && me && (
                        <Link href={`/messages/${user.username}`} className="cm-btn" style={{ textDecoration: "none" }}>
                            Message
                        </Link>
                    )}
                    {isSelf && (
                        <Link href="/profile" className="cm-btn ghost" style={{ textDecoration: "none" }}>
                            Edit profile
                        </Link>
                    )}
                </div>

                {user.showActivity && (
                    <>
                        <div className="cm-stats">
                            <div className="cm-stat">
                                <div className="n">{threadCount}</div>
                                <div className="l">Topics started</div>
                            </div>
                            <div className="cm-stat">
                                <div className="n">{postCount}</div>
                                <div className="l">Posts</div>
                            </div>
                            <div className="cm-stat">
                                <div className="n">{memberSince(user.createdAt).split(" ")[1]}</div>
                                <div className="l">Joined</div>
                            </div>
                        </div>

                        {recentThreads.length > 0 && (
                            <>
                                <div className="cm-sec">
                                    <h2>Recent topics</h2>
                                </div>
                                <div className="cm-list">
                                    {recentThreads.map((t) => (
                                        <Link key={t.slug} href={threadHref(t)} className="cm-card">
                                            <div className="meta">
                                                <span className="t">{t.title}</span>
                                                <span className="d">{t.forum?.name ?? "Forum"}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}