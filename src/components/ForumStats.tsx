// src/components/ForumStats.tsx
import Link from "next/link";
import { getForumStats } from "@/lib/forum";
import "./forum-panels.css";

// Numbers cycle the warm category palette (terracotta, olive, gold, teal).
const ACCENTS = ["#c2603a", "#5b6b3f", "#c79a3c", "#3f6b5b"];

export default async function ForumStats() {
    const s = await getForumStats();

    const tiles = [
        { n: s.forums, label: "Forums" },
        { n: s.topics, label: "Topics" },
        { n: s.posts, label: "Posts" },
        { n: s.members, label: "Members" },
    ];

    return (
        <div className="fpanel-wrap">
            <section className="fstats">
                {/* faint botanical motif, top-right */}
                <svg className="fstats-sprig" viewBox="0 0 80 80" aria-hidden>
                    <path d="M40 74 C40 56 38 40 50 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    <g fill="currentColor">
                        <ellipse cx="31" cy="51" rx="11" ry="5" transform="rotate(-34 31 51)" />
                        <ellipse cx="49" cy="43" rx="11" ry="5" transform="rotate(30 49 43)" />
                        <ellipse cx="34" cy="35" rx="10" ry="4.5" transform="rotate(-30 34 35)" />
                        <ellipse cx="49" cy="28" rx="9.5" ry="4.3" transform="rotate(32 49 28)" />
                    </g>
                </svg>

                <div className="fstats-kicker">
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <path d="M3 13C3 7 8 3 14 3c0 6-5 10-11 10z" strokeLinejoin="round" />
                        <path d="M3.5 12.5c3-3 6-5 9.5-6" strokeLinecap="round" />
                    </svg>
                    <span>By the numbers</span>
                </div>

                <div className="fstats-grid">
                    {tiles.map((t, i) => (
                        <div className="fstats-item" key={t.label}>
              <span className="fstats-num" style={{ color: ACCENTS[i % ACCENTS.length] }}>
                {t.n.toLocaleString()}
              </span>
                            <span className="fstats-label">{t.label}</span>
                        </div>
                    ))}
                </div>

                <div className="fstats-foot">
          <span className="fstats-foot-item">
            <span className="fstats-foot-key">Latest post</span>
              {s.latestPost ? (
                  <>
                      <Link href={s.latestPost.href}>{s.latestPost.threadTitle}</Link>
                      <span className="fstats-foot-sub">
                  by {s.latestPost.author} · {s.latestPost.at}
                </span>
                  </>
              ) : (
                  <span className="fstats-foot-sub">No posts yet</span>
              )}
          </span>

                    {s.newestMember ? (
                        <span className="fstats-foot-item">
              <span className="fstats-foot-key">Newest member</span>
              <Link href={`/u/${s.newestMember.username}`}><strong>{s.newestMember.name}</strong></Link>
            </span>
                    ) : null}
                </div>
            </section>
        </div>
    );
}