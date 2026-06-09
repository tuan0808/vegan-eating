
// src/app/about/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import "./about.css";
import PageHero from "@/components/PageHero";

export const metadata: Metadata = {
    title: "About — vegan eating",
    description: "The story behind vegan eating: a community-first, ad-free, hand-built home for plant-based cooking.",
};

const pillars = [
    {
        n: "01", title: "Recipe Exchange",
        body: "Discover, create, and share plant-based recipes for every taste and skill level — whether you're a confident cook or burning your first batch of tofu.",
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 7h11l-3-3M17 17H6l3 3" /></svg>),
    },
    {
        n: "02", title: "Knowledge Hub",
        body: "Articles, guides, nutrition notes, and transition tips — kept current and genuinely useful, not search-engine filler written to sell you something.",
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 5h7v15H4zM20 5h-7v15h7z" /><path d="M4 5a2 2 0 0 0-2 2v13M20 5a2 2 0 0 1 2 2v13" /></svg>),
    },
    {
        n: "03", title: "Supportive Community",
        body: "Going vegan around non-vegan friends and family is hard. The forum is where you celebrate the wins, troubleshoot the rest, and find people who get it.",
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-4.9A8.4 8.4 0 1 1 21 11.5z" /></svg>),
    },
];

export default function AboutPage() {
    return (
        <><PageHero
            image="/header/about.jpg"
            kicker="About Us"
            title="We rebuilt the whole thing by hand"
            dek="No WordPress, no plugins, no ads creeping in at the margins. Just a community, a recipe archive, and a lot of testing."
        />
            <div className="abt-wrap abt-story">
                <figure className="abt-portrait">
                    <div className="abt-portrait-img">
                        <img src="/2024/vegor.png" alt="Vegor, the vegan eating mascot — a thoughtful chef" />
                    </div>
                    <figcaption>Vegor — our resident over-thinker</figcaption>
                </figure>
                <div className="abt-story-text">
                    <h2 className="abt-h2">General</h2>
                    <p>
                        vegan eating started as a community — a place for people who'd decided plant-based was worth doing properly. A forum where cooks from every corner swapped wins, disasters, and the occasional heated debate about whether aquafaba counts as cheating. Around it grew a recipe archive, added one tested dish at a time.
                    </p>
                    <p>
                        For years it ran on WordPress, like everywhere else. Same plugins, same theme, the same tired layout you've seen on a hundred other food sites. So we tore it down and rebuilt it from scratch — our own code, our own design, no ad network deciding what you see.
                    </p>
                    <p>
                        What you're looking at is the result: faster, cleaner, and entirely ours. The mission didn't change, though. Good food, honestly tested, and a community to cook it with.
                    </p>
                </div>
            </div>

            <div className="abt-wrap abt-pillars">
                {pillars.map((p) => (
                    <section className="abt-pillar" key={p.n}>
                        <span className="abt-pillar-n">{p.n}</span>
                        <span className="abt-pillar-icon">{p.icon}</span>
                        <h3 className="abt-pillar-title">{p.title}</h3>
                        <p className="abt-pillar-body">{p.body}</p>
                    </section>
                ))}
            </div>

            <div className="abt-cta">
                <div className="abt-wrap abt-cta-inner">
                    <h2 className="abt-cta-title">Pull up a chair</h2>
                    <p>Veganism is more than a diet — it's a community. Come cook with us.</p>
                    <div className="abt-cta-row">
                        <Link href="/forum" className="abt-btn abt-btn-primary">Join the conversation</Link>
                        <Link href="/recipes" className="abt-btn abt-btn-ghost">Browse recipes</Link>
                    </div>
                </div>
            </div>
        </>
    );
}