// src/app/about/page.tsx
import Link from "next/link";
import "./about.css";
import PageHero from "@/components/PageHero";
import { mediaUrl } from "@/lib/media";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
    title: "About",
    description: "The story behind vegan eating: a community-first, ad-free, hand-built home for plant-based cooking.",
    path: "/about",
});

const pillars = [
    {
        n: "01", title: "Recipe Exchange", href: "/recipes",
        body: "Discover, create, and share plant-based recipes for every taste and skill level — whether you're a confident cook or burning your first batch of tofu.",
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 7h11l-3-3M17 17H6l3 3" /></svg>),
    },
    {
        n: "02", title: "Knowledge Hub", href: "/articles",
        body: "Articles, guides, nutrition notes, and transition tips — kept current and genuinely useful, not search-engine filler written to sell you something.",
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 5h7v15H4zM20 5h-7v15h7z" /><path d="M4 5a2 2 0 0 0-2 2v13M20 5a2 2 0 0 1 2 2v13" /></svg>),
    },
    {
        n: "03", title: "Supportive Community", href: "/forum",
        body: "Going vegan around non-vegan friends and family is hard. The forum is where you celebrate the wins, troubleshoot the rest, and find people who get it.",
        icon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L3 21l1.1-4.9A8.4 8.4 0 1 1 21 11.5z" /></svg>),
    },
];

export default function AboutPage() {
    return (
        <><PageHero
            image="/header/about.jpg"
            kicker="About Us"
            title="Made by people who actually cook"
            dek="Whatever brought you to plants, you're welcome here. Come for the recipes, stay for the community."
        />
            <div className="abt-wrap abt-story">
                <figure className="abt-portrait">
                    <div className="abt-portrait-img">
                        <img src={mediaUrl("/2024/vegor.png")} alt="Vegor, the vegan eating mascot — a thoughtful chef" />
                    </div>
                    <figcaption>Vegor — our resident over-thinker</figcaption>
                </figure>
                <div className="abt-story-text">
                    <h2 className="abt-h2">General</h2>
                    <p>
                        Vegan eating started as a community — a place for people who'd decided plant-based was worth doing properly. A forum where cooks from every corner swapped wins, disasters, and the occasional heated debate about whether aquafaba counts as cheating. Around it grew a recipe archive, added one tested dish at a time.                    </p>
                    <p>
                        Underneath all of it is one stubborn belief: eating well shouldn't feel like a punishment. Somewhere along the way "healthy" got tangled up with deprivation — sad desk salads, joyless powders, a running list of everything you're not allowed to have. We never bought it. Plants do the heavy lifting here: steadier energy, a body that runs better, a gut and a mood that quietly thank you, and food that actually tastes like something.                    </p>
                    <p>
                        And we're not here to preach you into it. No before-and-afters, no guilt trips, no wellness influencer swearing celery juice will fix your life. Just real meals, tested until they work, that happen to be good for you — because feeling good and eating good were never meant to be two separate projects. You don't have to be perfect, sworn-in, or even fully converted. You just have to be hungry.                    </p>
                    <p> That's the whole point of this place: good food, honestly tested, and a community to figure it out with — the people who'll cheer your first decent block of tofu and gently roast your third failed cheese sauce. The mission hasn't budged since day one. So pull up a chair, grab a fork, and feel better for it.
                    </p>
                </div>
            </div>

            <div className="abt-wrap abt-pillars">
                {pillars.map((p) => (
                    <Link
                        href={p.href}
                        className="abt-pillar"
                        key={p.n}
                        style={{ textDecoration: "none", color: "inherit" }}
                    >
                        <span className="abt-pillar-n">{p.n}</span>
                        <span className="abt-pillar-icon">{p.icon}</span>
                        <h3 className="abt-pillar-title">{p.title}</h3>
                        <p className="abt-pillar-body">{p.body}</p>
                    </Link>
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