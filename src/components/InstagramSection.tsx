// Home-page Instagram strip: our latest @VeganEating_Com posts, pulled via the
// Instagram Graph API (see src/lib/instagram.ts). Rendered only when the feed
// is configured and returns posts, so it never shows an empty shell.
import type { IgPost } from "@/lib/instagram";
import { IG_HANDLE, IG_HASHTAG } from "@/lib/instagram";

const IgGlyph = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="2" width="20" height="20" rx="5.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
);

export default function InstagramSection({ posts }: { posts: IgPost[] }) {
    if (!posts.length) return null;
    const profile = `https://instagram.com/${IG_HANDLE}`;
    return (
        <div className="wrap">
            <section className="ig-sec">
                <div className="sec-head">
                    <div>
                        <span className="kicker" style={{ color: "var(--carrot)" }}>
                            <IgGlyph /> #{IG_HASHTAG}
                        </span>
                        <h2 style={{ marginTop: 10 }}>From our community</h2>
                    </div>
                    <a href={profile} target="_blank" rel="noopener noreferrer">
                        Follow @{IG_HANDLE} →
                    </a>
                </div>

                <div className="ig-grid">
                    {posts.map((p) => (
                        <a
                            key={p.id}
                            className="ig-cell"
                            href={p.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={p.caption?.slice(0, 120) || `@${IG_HANDLE} on Instagram`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {/* Instagram's scontent CDN 403s hotlinked images when a
                                cross-origin Referer is sent — suppress it so the tile loads. */}
                            <img src={p.imageUrl} alt={p.caption?.slice(0, 80) || "Instagram post"} loading="lazy" referrerPolicy="no-referrer" />
                            {p.isVideo && (
                                <span className="ig-play" aria-hidden="true">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                </span>
                            )}
                            <span className="ig-overlay" aria-hidden="true"><IgGlyph /></span>
                        </a>
                    ))}
                </div>
            </section>
        </div>
    );
}
