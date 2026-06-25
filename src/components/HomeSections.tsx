// src/components/HomeSections.tsx
import Link from "next/link";
import { stats, cooks } from "@/data/site";
import { latestThreads } from "@/lib/home-threads";
import { prisma } from "@/lib/prisma";
import { buildWhere } from "@/lib/recipe-filters";
import { countByCat } from "@/lib/recipes";
import { homeCollections, pillCategories } from "@/lib/category-config";
import BandNewsletter from "./BandNewsletter";

const Arrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

export async function Pills() {
    const cats = await pillCategories();
    return (
        <div className="cats">
            <div className="wrap">
                <span className="label">Browse</span>
                {cats.map((c, i) => (
                    <span key={c.slug} className={`pill${i === 0 ? " active" : ""}`}>{c.label}</span>
                ))}
            </div>
        </div>
    );
}

export function Trust() {
    return (
        <div className="wrap">
            <div className="trust">
                {stats.map((s) => (
                    <div className="stat" key={s.lab}>
                        <div className="num">{s.num}</div>
                        <div className="lab">{s.lab}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Normalises WP-style relative image paths to absolute. Full URLs pass through.
function imgSrc(src?: string | null): string | null {
    if (!src) return null;
    if (/^https?:\/\//i.test(src) || src.startsWith("/")) return src;
    return "/" + src.replace(/^\.?\//, "");
}

// One random recipe image from the SAME set the tile links to (reuses buildWhere
// so the photo always represents that collection). Null when it has no images.
async function collectionImage(cat: string): Promise<string | null> {
    const where = { ...buildWhere(cat, ""), hidden: false, image: { not: null } };
    const count = await prisma.recipe.count({ where });
    if (!count) return null;
    const skip = Math.floor(Math.random() * count);
    const row = await prisma.recipe.findFirst({ where, skip, select: { image: true } });
    return imgSrc(row?.image);
}

export async function Collections() {
    // Admin-managed collections (homepage cards), in order.
    const cats = await homeCollections();
    // One image + live recipe count per collection, in parallel. Counts use the
    // same filter as the /recipes page so the card never drifts from the page.
    const [images, counts] = await Promise.all([
        Promise.all(cats.map((c) => collectionImage(c.slug))),
        Promise.all(cats.map((c) => countByCat(c.slug))),
    ]);

    return (
        <div className="wrap">
            <section style={{ paddingTop: 30 }}>
                <div className="sec-head">
                    <div>
                        <span className="kicker" style={{ color: "var(--gold)" }}>Hand-picked by our editors</span>
                        <h2 style={{ marginTop: 10 }}>Cook by collection</h2>
                    </div>
                    <Link href="/recipes">All collections <Arrow /></Link>
                </div>
                <div className="collections">
                    {/* hover lift + soft shadow (RSC-safe global style, scoped to .collections) */}
                    <style>{`
                        .collections .col-tile { transition: transform .22s ease, box-shadow .22s ease; }
                        .collections .col-tile:hover { transform: translateY(-6px); box-shadow: 0 20px 44px -20px rgba(20,16,12,.5); }
                    `}</style>
                    {cats.map((c, i) => {
                        const img = images[i];
                        return (
                            <Link href={`/recipes?cat=${c.slug}`} className="col-tile" key={c.slug} style={{ isolation: "isolate" }}>
                                {/* photo base layer */}
                                {img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={img}
                                        alt=""
                                        aria-hidden="true"
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
                                    />
                                ) : null}
                                {/* your colour gradient — light tint over the photo (opaque when no photo) */}
                                <div className={`ph ${c.ph}`} style={img ? { opacity: 0.42, zIndex: 1 } : undefined} />
                                {/* dark fade at the bottom so the white title/count stay readable */}
                                {img ? (
                                    <div
                                        style={{
                                            position: "absolute",
                                            inset: 0,
                                            zIndex: 2,
                                            background: "linear-gradient(to top, rgba(18,14,10,0.74), rgba(18,14,10,0) 58%)",
                                        }}
                                    />
                                ) : null}
                                <div className="col-tile-body" style={{ zIndex: 3 }}>
                                    <h3>{c.label}</h3>
                                    <span>{counts[i]} recipes <svg className="arr" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

export async function ForumSection() {
    const items = await latestThreads(3);
    return (
        <div className="forum">
            <div className="wrap">
                <section>
                    <div className="sec-head">
                        <div>
                            <span className="kicker" style={{ color: "var(--olive)" }}>The Kitchen Table</span>
                            <h2 style={{ marginTop: 10 }}>What the community is talking about</h2>
                        </div>
                        <Link href="/forum" style={{ color: "var(--olive)" }}>Open the forum <Arrow /></Link>
                    </div>
                    {items.length === 0 ? (
                        <p style={{ color: "var(--muted)", padding: "6px 0 2px" }}>
                            No discussions yet — be the first to start one.
                        </p>
                    ) : (
                        <div className="threads">
                            {items.map((t) => (
                                <Link className="thread reveal" key={t.slug} href={t.href}>
                                    <span className="avatar" style={{ background: t.accent }}>{t.initial}</span>
                                    <div>
                                        <span className="thread-cat" style={{ color: t.accent }}>{t.cat}</span>
                                        <h3>{t.title}</h3>
                                        <div className="t-meta">{t.meta}</div>
                                    </div>
                                    <div className="t-stats"><b>{t.replies}</b>replies</div>
                                </Link>
                            ))}
                        </div>
                    )}
                    <div style={{ marginTop: 28, display: "flex", gap: 14, flexWrap: "wrap" }}>
                        <Link href="/forum" className="btn-primary" style={{ background: "var(--olive)", boxShadow: "0 10px 28px -12px rgba(34,95,39,.7)" }}>
                            Start a discussion
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
                        </Link>
                        <Link href="/forum" className="pill" style={{ padding: "15px 24px" }}>Browse all topics</Link>
                    </div>
                </section>
            </div>
        </div>
    );
}

export function CooksSection() {
    return (
        <div className="wrap">
            <section>
                <div className="sec-head">
                    <div>
                        <span className="kicker">The people behind the recipes</span>
                        <h2 style={{ marginTop: 10 }}>Meet the cooks</h2>
                    </div>
                    <Link href="#">All contributors <Arrow /></Link>
                </div>
                <div className="cooks">
                    {cooks.map((c, i) => (
                        <div className="cook reveal" key={c.name} style={{ transitionDelay: `${i * 0.08}s` }}>
                            <span className={`avatar ${c.avatar}`}>{c.name[0]}</span>
                            <h3>{c.name}</h3>
                            <div className="role">{c.role}</div>
                            <p className="bio">{c.bio}</p>
                            <span className="follow">+ Follow</span>
                            <div className="rcount">{c.recipes} recipes</div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}

export function JoinBand() {
    return (
        <div className="wrap">
            <div className="band">
                <div>
                    <span className="kicker" style={{ color: "var(--gold)" }}>More than a recipe site</span>
                    <h2>A kitchen full of people, not a wall of instructions.</h2>
                    <p>Create a free account to save recipes, rate what you cook, swap tips in the forum, and follow your favourite contributors. Plus one tested recipe in your inbox each Sunday.</p>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
                        <Link href="/register" className="btn-primary">
                            Create a free account <Arrow />
                        </Link>
                        <Link href="/forum" className="pill" style={{ padding: "15px 24px", background: "transparent", color: "var(--paper)", borderColor: "rgba(244,243,234,.4)" }}>Browse the forum</Link>
                    </div>
                    <BandNewsletter />
                </div>
                <div className="band-img">
                    <div className="photo">
                        <video
                            src="/media/veganeating.mp4"
                            autoPlay
                            muted
                            loop
                            playsInline
                            aria-hidden="true"
                            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}