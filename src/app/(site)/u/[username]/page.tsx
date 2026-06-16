// src/app/(site)/u/[username]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import { publicProfile, threadHref } from "@/lib/community";
import PageHero from "@/components/PageHero";
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

const greenBtn: React.CSSProperties = {
    display: "inline-block",
    background: "var(--green, #5b6b3f)",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    padding: "13px 24px",
    borderRadius: 999,
    textDecoration: "none",
};

export default async function PublicProfilePage({
                                                    params,
                                                }: {
    params: { username: string };
}) {
    const data = await publicProfile(params.username);
    if (!data || data.user.banned) notFound();

    const { user, threadCount, postCount, recentThreads, recipes } = data;
    const me = await currentUser();
    const isSelf = me?.id === user.id;

    const avatar = user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={user.avatarUrl}
            alt=""
            style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,.85)" }}
        />
    ) : (
        <div
            style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,.16)",
                border: "3px solid rgba(255,255,255,.85)",
                fontFamily: 'var(--display, "Fraunces", serif)',
                fontSize: 34,
                fontWeight: 600,
                color: "#fff",
            }}
        >
            {monogram(user.name, user.username)}
        </div>
    );

    return (
        <>
            <PageHero
                image="/header/about.jpg"
                kicker={user.role}
                title={user.name ?? user.username}
                dek={`@${user.username} · Member since ${memberSince(user.createdAt)}`}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 28 }}>
                    {avatar}
                    {isSelf ? (
                        <Link href="/profile" style={greenBtn}>Edit profile</Link>
                    ) : me ? (
                        <Link href={`/messages/${user.username}`} style={greenBtn}>Message</Link>
                    ) : null}
                </div>
            </PageHero>

            <div className="wrap" style={{ padding: "44px 28px 72px" }}>
                {user.bio && (
                    <p className="cm-sub" style={{ maxWidth: 680 }}>{user.bio}</p>
                )}

                {(user.location || user.website) && (
                    <div className="cm-row" style={{ marginTop: 10 }}>
                        {user.location && <span style={{ color: "var(--muted,#6b7264)" }}>📍 {user.location}</span>}
                        {user.website && (
                            <a href={user.website} target="_blank" rel="noopener noreferrer nofollow">
                                {user.website.replace(/^https?:\/\//, "")}
                            </a>
                        )}
                    </div>
                )}

                {user.showActivity && (
                    <>
                        <div className="cm-stats" style={{ marginTop: 24 }}>
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

                {recipes.length > 0 && (
                    <>
                        <div className="cm-sec">
                            <h2>Recipes</h2>
                            <Link href="/recipes">All recipes</Link>
                        </div>
                        <div className="cm-list">
                            {recipes.map((r) => (
                                <Link key={r.slug} href={`/recipes/${r.slug}`} className="cm-card">
                                    {r.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img className="cm-thumb" src={r.image} alt="" />
                                    ) : (
                                        <div className="cm-thumb" />
                                    )}
                                    <div className="meta">
                                        <span className="t">{r.title}</span>
                                        {r.date ? <span className="d">{r.date}</span> : null}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}