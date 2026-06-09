// src/app/(site)/forum/page.tsx
import type { Metadata } from "next";
import { getForumIndex, getForumStats, getRecentMembers } from "@/lib/forum";
import ForumIndex from "@/components/ForumIndex";
import ForumAdminPanel from "@/components/ForumAdminPanel";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
    title: "Forums — vegan eating",
    description: "Join the conversation: recipes, guides, introductions, and more.",
};

export const revalidate = 60;

const topicIcon = (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2.4" y="3.4" width="11.2" height="7.2" rx="2" />
        <path d="M5.6 10.6L4.2 12.6v-2" />
    </svg>
);
const postIcon = (
    <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 4.5h8M4 8h8M4 11.5h5" />
    </svg>
);

export default async function ForumPage() {
    const [categories, stats, members] = await Promise.all([
        getForumIndex(),
        getForumStats(),
        getRecentMembers(4),
    ]);

    return (
        <>
            <PageHero
                image="/header/forum.jpg"
                kicker="The Community"
                title="Forums"
                dek="Join the conversation — recipes, guides, introductions, and everything plant-based. Pull up a chair and say hello."
                meta={[
                    { icon: topicIcon, value: stats.topics.toLocaleString(), label: "topics" },
                    { icon: postIcon, value: stats.posts.toLocaleString(), label: "posts" },
                ]}
                cta={{ label: "Browse the boards →", href: "#boards" }}
            >
                {members.length ? (
                    <div className="phero-people">
                        <div className="phero-avatars">
                            {members.map((m, i) => (
                                <span key={i} className="phero-avatar" style={{ background: m.color }}>
                  {m.initial}
                </span>
                            ))}
                        </div>
                        <span className="phero-people-text">
              <strong>{stats.members.toLocaleString()} members</strong> in the community
            </span>
                    </div>
                ) : null}
            </PageHero>

            <div id="boards" />
            <ForumIndex categories={categories} />
            <ForumAdminPanel />
        </>
    );
}