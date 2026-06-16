// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { subscribeEmail } from "@/app/actions/newsletter";
import "./header-nav.css";

// Logo kept as before (uses your global .brand/.logo-* styles) so the footer's
// `import { Logo } from "./Header"` keeps working. In the nav it's forced white.
export function Logo({ height = 42 }: { height?: number }) {
    const ratio = 444.769 / 117.885; // native aspect ratio of the SVG
    return (
        <img
            src="/logo/logo.svg"
            alt="vegan eating"
            width={Math.round(height * ratio)}
            height={height}
            style={{ height, width: "auto", display: "block" }}
        />
    );
}

type Col = { heading: string; links: { label: string; href: string; note?: string }[] };
type Feature = { kicker: string; title: string; href: string; gradient?: string };
type Item = { label: string; href: string; key?: string; cols?: Col[]; feature?: Feature; blurb?: string };

const MENU: Item[] = [
    { label: "Home", href: "/" },
    {
        label: "Recipes", href: "/recipes", key: "recipes",
        cols: [
            { heading: "By course", links: [
                    { label: "Breakfast", href: "/recipes?cat=breakfast" },
                    { label: "Mains", href: "/recipes?cat=mains" },
                    { label: "Salads & bowls", href: "/recipes?cat=salads-bowls" },
                    { label: "Desserts", href: "/recipes?cat=desserts" },
                    { label: "Baking", href: "/recipes?cat=baking" },
                ] },
            { heading: "By time", links: [
                    { label: "30 minutes", href: "/recipes?cat=30-minutes", note: "Weeknight-fast" },
                    { label: "All recipes", href: "/recipes" },
                ] },
        ],
        feature: { kicker: "Featured recipe", title: "From the kitchen", href: "/recipes" }, // fallback; replaced live
    },
    { label: "Forum", href: "/forum" },
    {
        label: "Submit recipe", href: "/submit", key: "submit",
        cols: [
            { heading: "Submit", links: [
                    { label: "Submit recipe", href: "/submit", note: "Share yours with the community" },
                ] },
            { heading: "Tools", links: [
                    { label: "Veganize recipe", href: "/veganize", note: "Swap out the animal products" },
                ] },
        ],
        blurb: "The best recipes here come from the community. Share yours — or paste any recipe into the Veganizer to make it plant-based in seconds.",
    },
    {
        label: "Health", href: "/articles", key: "health",
        cols: [
            { heading: "Read up", links: [
                    { label: "Health & Nutrition", href: "/articles?cat=health-nutrition" },
                    { label: "Special Diets", href: "/articles?cat=special-diets" },
                    { label: "Ingredients", href: "/articles?cat=ingredients" },
                    { label: "Budget & Sustainability", href: "/articles?cat=budget-sustainability" },
                    { label: "Occasions & Lifestyle", href: "/articles?cat=occasions-lifestyle" },
                ] },
            { heading: "Guides", links: [
                    { label: "Cooking Techniques", href: "/articles?cat=cooking-techniques" },
                    { label: "Equipment & Appliances", href: "/articles?cat=equipment-appliances" },
                    { label: "Baking", href: "/articles?cat=baking" },
                    { label: "DIY & Fermenting", href: "/articles?cat=diy-fermenting" },
                    { label: "World Cuisines", href: "/articles?cat=world-cuisines" },
                ] },
        ],
        feature: { kicker: "This week's read", title: "The truth about B12", href: "/articles", gradient: "linear-gradient(135deg,#2f6b43,#5BB35F)" },
    },
    { label: "News", href: "/news" },
    {
        label: "About us", href: "/about", key: "about",
        cols: [
            { heading: "About", links: [
                    { label: "Directory", href: "/directory" },
                    { label: "About us", href: "/about" },
                ] },
        ],
        blurb: "The people and pages behind vegan eating — honest, tested, and ad-free. Eat green, feel green.",
    },
];

const Chevron = () => (
    <svg className="vn-chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M6 9l6 6 6-6" /></svg>
);
const Leaf = () => (
    <svg className="vn-leaf" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12" /><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6Z" /><path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5Z" /></svg>
);

type Featured = { title: string; slug: string; image: string | null };

// Rotating placeholder phrases for the search modal (matches the home page).
const SEARCH_PHRASES = [
    "what's in your fridge?",
    "half a butternut squash…",
    "a tin of chickpeas…",
    "leftover spinach + lemon…",
    "whatever's about to turn…",
];

// Minimal, serializable shape passed down from the (server) layout — Header is
// a client component and can't read the session itself.
type NavUser = { name?: string | null; username?: string | null };

export default function Header() {
    // Auth state is fetched client-side so the public pages stay static/ISR —
    // reading the session in the (server) layout would force every page under
    // it to render dynamically. `authReady` guards against flashing the wrong
    // control (e.g. "Sign in" to someone who's actually logged in).
    const [authUser, setAuthUser] = useState<NavUser | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const displayName = (authUser?.name || authUser?.username || "").trim();
    const initial = displayName.charAt(0).toUpperCase() || "•";

    const [openKey, setOpenKey] = useState<string | null>(null);
    const [lifted, setLifted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [featured, setFeatured] = useState<Featured | null>(null);
    const [featuredArticle, setFeaturedArticle] = useState<Featured | null>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Search
    const router = useRouter();
    const [searchOpen, setSearchOpen] = useState(false);
    const [q, setQ] = useState("");
    const searchRef = useRef<HTMLInputElement | null>(null);
    const [phPlaceholder, setPhPlaceholder] = useState("");
    const twState = useRef({ pi: 0, ci: 0, deleting: false });

    const SEARCH_CHIPS = ["chickpeas", "spinach", "tofu", "sweet potato", "lentils", "coconut milk", "mushrooms"];

    // Subscribe
    const [subOpen, setSubOpen] = useState(false);
    const [subEmail, setSubEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);
    const [subErr, setSubErr] = useState<string | null>(null);
    const [subBusy, setSubBusy] = useState(false);

    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    // Typewriter placeholder — only while the modal is open and the field is empty.
    const searchEmpty = q.length === 0;
    useEffect(() => {
        if (!searchOpen || !searchEmpty) return;
        let timer: ReturnType<typeof setTimeout>;
        const tick = () => {
            const s = twState.current;
            const full = SEARCH_PHRASES[s.pi];
            setPhPlaceholder(full.slice(0, s.ci));
            if (!s.deleting && s.ci < full.length) { s.ci++; timer = setTimeout(tick, 70); }
            else if (!s.deleting && s.ci === full.length) { s.deleting = true; timer = setTimeout(tick, 1500); }
            else if (s.deleting && s.ci > 0) { s.ci--; timer = setTimeout(tick, 34); }
            else { s.deleting = false; s.pi = (s.pi + 1) % SEARCH_PHRASES.length; timer = setTimeout(tick, 220); }
        };
        tick();
        return () => clearTimeout(timer);
    }, [searchOpen, searchEmpty]);

    const openSearch = () => {
        twState.current = { pi: 0, ci: 0, deleting: false };
        setPhPlaceholder("");
        setSearchOpen(true);
        setMobileOpen(false);
    };
    const doSearch = (term?: string) => {
        const t = (term ?? q).trim();
        if (!t) return;
        router.push(`/recipes?q=${encodeURIComponent(t)}`);
        setSearchOpen(false);
        setQ("");
    };
    // Enter inside the field submits the form.
    const submitSearch = (e: React.FormEvent) => { e.preventDefault(); doSearch(); };
    const surprise = () => { router.push("/recipes/random"); setSearchOpen(false); };

    const submitSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = subEmail.trim();
        if (!/.+@.+\..+/.test(email)) { setSubErr("Enter a valid email address."); return; }
        setSubErr(null);
        setSubBusy(true);
        const res = await subscribeEmail(email);
        setSubBusy(false);
        if (res.ok) setSubscribed(true);
        else setSubErr(res.error);
    };

    const openSubscribe = () => { setSubscribed(false); setSubErr(null); setSubEmail(""); setSubOpen(true); setMobileOpen(false); };

    useEffect(() => {
        const onScroll = () => setLifted(window.scrollY > 4);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenKey(null); setMobileOpen(false); setSearchOpen(false); setSubOpen(false); } };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        let on = true;
        fetch("/api/featured-recipe")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (on && d && d.slug) setFeatured(d); })
            .catch(() => {});
        return () => { on = false; };
    }, []);

    useEffect(() => {
        let on = true;
        fetch("/api/featured-article")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (on && d && d.slug) setFeaturedArticle(d); })
            .catch(() => {});
        return () => { on = false; };
    }, []);

    // Who's logged in? Read the NextAuth session endpoint on the client so the
    // rest of the site can stay statically rendered.
    useEffect(() => {
        let on = true;
        fetch("/api/auth/session")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!on) return;
                const u = d && d.user ? d.user : null;
                setAuthUser(u ? { name: u.name, username: u.username } : null);
                setAuthReady(true);
            })
            .catch(() => { if (on) setAuthReady(true); });
        return () => { on = false; };
    }, []);

    const show = (k: string) => { if (hideTimer.current) clearTimeout(hideTimer.current); setOpenKey(k); };
    const scheduleHide = () => { hideTimer.current = setTimeout(() => setOpenKey(null), 130); };
    const clearHide = () => { if (hideTimer.current) clearTimeout(hideTimer.current); };

    const panelItems = MENU.filter((it) => it.cols);

    const renderFeature = (it: Item) => {
        // Recipes uses the live recipe; others use their static feature/blurb.
        if (it.key === "recipes") {
            const href = featured ? `/recipes/${featured.slug}` : it.feature!.href;
            const title = featured ? featured.title : it.feature!.title;
            return (
                <Link className="vn-feature" href={href} onClick={() => setOpenKey(null)}>
                    <div className="vn-ph" style={{ background: "linear-gradient(135deg,#c26b3a,#e0853f 60%,#caa15a)" }}>
                        {featured?.image ? <img className="vn-ph-img" src={featured.image} alt="" /> : null}
                    </div>
                    <div className="vn-cap"><span className="vn-k">Featured recipe</span><h5>{title}</h5></div>
                </Link>
            );
        }
        if (it.key === "health") {
            const href = featuredArticle ? `/articles/${featuredArticle.slug}` : it.feature!.href;
            const title = featuredArticle ? featuredArticle.title : it.feature!.title;
            return (
                <Link className="vn-feature" href={href} onClick={() => setOpenKey(null)}>
                    <div className="vn-ph" style={{ background: it.feature!.gradient || "linear-gradient(135deg,#2f6b43,#5BB35F)" }}>
                        {featuredArticle?.image ? <img className="vn-ph-img" src={featuredArticle.image} alt="" /> : null}
                    </div>
                    <div className="vn-cap"><span className="vn-k">{it.feature!.kicker}</span><h5>{title}</h5></div>
                </Link>
            );
        }
        if (it.feature) {
            return (
                <Link className="vn-feature" href={it.feature.href} onClick={() => setOpenKey(null)}>
                    <div className="vn-ph" style={{ background: it.feature.gradient || "linear-gradient(135deg,#c26b3a,#e0853f 60%,#caa15a)" }}>
                        <span>Your photo here</span>
                    </div>
                    <div className="vn-cap"><span className="vn-k">{it.feature.kicker}</span><h5>{it.feature.title}</h5></div>
                </Link>
            );
        }
        if (it.blurb) return <div className="vn-blurb"><p>{it.blurb}</p></div>;
        return null;
    };

    return (
        <header id="hdr" className={`vn-hdr${lifted ? " lifted" : ""}`}>
            <div className="vn-bar">
                <div className="vn-wrap vn-nav">
                    <Link href="/" aria-label="vegan eating home" onClick={() => setMobileOpen(false)}><Logo /></Link>

                    <nav className="vn-menu" onMouseLeave={scheduleHide}>
                        {MENU.map((it) =>
                            it.cols ? (
                                <div key={it.label} className={`vn-item${openKey === it.key ? " open" : ""}`} onMouseEnter={() => show(it.key!)}>
                                    <Link href={it.href} onClick={(e) => { e.preventDefault(); setOpenKey(openKey === it.key ? null : it.key!); }}>
                                        {it.label} <Chevron />
                                    </Link>
                                </div>
                            ) : (
                                <div key={it.label} className="vn-item"><Link href={it.href}>{it.label}</Link></div>
                            )
                        )}
                    </nav>

                    <div className="vn-right">
                        <button type="button" className="vn-icon" aria-label="Search recipes" onClick={openSearch}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                        </button>
                        {!authReady ? (
                            <span className="vn-avatar vn-avatar-skel" aria-hidden />
                        ) : authUser ? (
                            <Link href="/dashboard" className="vn-avatar" aria-label={`${displayName} — go to dashboard`} title={displayName}>
                                {initial}
                            </Link>
                        ) : (
                            <Link href="/login" className="vn-signin">Sign in</Link>
                        )}
                        <button type="button" className="vn-sub" onClick={openSubscribe}>Subscribe</button>
                        <button className="vn-burger" aria-label="Menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen((v) => !v)}>
                            <span /><span /><span />
                        </button>
                    </div>
                </div>

                <div className="vn-panels">
                    <div className="vn-wrap" style={{ position: "relative" }}>
                        {panelItems.map((it) => {
                            const cols = it.cols!;
                            const hasRail = !!it.feature || !!it.blurb || it.key === "recipes";
                            const gtc = cols.map(() => "1fr").join(" ") + (hasRail ? " 1.3fr" : "");
                            return (
                                <div key={it.key} className={`vn-panel${openKey === it.key ? " open" : ""}`} onMouseEnter={clearHide} onMouseLeave={scheduleHide}>
                                    <div className="vn-panel-inner">
                                        <Leaf />
                                        <div className="vn-grid" style={{ gridTemplateColumns: gtc }}>
                                            {cols.map((col) => (
                                                <div className="vn-col" key={col.heading}>
                                                    <h4>{col.heading}</h4>
                                                    {col.links.map((l) => (
                                                        <Link key={l.label} href={l.href} onClick={() => setOpenKey(null)}>
                                                            {l.label}{l.note ? <small>{l.note}</small> : null}
                                                        </Link>
                                                    ))}
                                                </div>
                                            ))}
                                            {renderFeature(it)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className={`vn-backdrop${openKey ? " show" : ""}`} onClick={() => setOpenKey(null)} />

            <div className={`vn-drawer${mobileOpen ? " open" : ""}`}>
                <button type="button" className="vn-d-parent" onClick={openSearch}>
                    Search recipes
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
                </button>
                {MENU.map((it) => (
                    <div key={it.label} className="vn-d-item">
                        {it.cols ? (
                            <>
                                <button className="vn-d-parent" onClick={() => setExpanded(expanded === it.key ? null : it.key!)} aria-expanded={expanded === it.key}>
                                    {it.label} <Chevron />
                                </button>
                                {expanded === it.key && (
                                    <div className="vn-d-sub">
                                        <Link href={it.href} onClick={() => setMobileOpen(false)}>All {it.label.toLowerCase()}</Link>
                                        {it.cols.flatMap((c) => c.links).map((l) => (
                                            <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)}>{l.label}</Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <Link className="vn-d-parent" href={it.href} onClick={() => setMobileOpen(false)}>{it.label}</Link>
                        )}
                    </div>
                ))}
                {authUser ? (
                    <div className="vn-d-item">
                        <Link className="vn-d-parent" href="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                    </div>
                ) : (
                    <>
                        <div className="vn-d-item">
                            <Link className="vn-d-parent" href="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                        </div>
                        <div className="vn-d-item">
                            <Link className="vn-d-parent" href="/register" onClick={() => setMobileOpen(false)}>Create account</Link>
                        </div>
                    </>
                )}
                <button type="button" className="vn-sub vn-sub-drawer" onClick={openSubscribe}>Subscribe</button>
            </div>

            {searchOpen && (
                <div className="vn-modal-back" onClick={() => setSearchOpen(false)}>
                    <div className="vn-modal vn-search-modal" role="dialog" aria-modal="true" aria-label="Search recipes" onClick={(e) => e.stopPropagation()}>
                        <button className="vn-modal-x" aria-label="Close" onClick={() => setSearchOpen(false)}>×</button>
                        <span className="vn-modal-kicker">Start with your kitchen</span>
                        <h3>What can you cook tonight?</h3>
                        <form className="vn-sform" onSubmit={submitSearch}>
                            <div className="vn-sform-bar">
                <span className="vn-sform-leaf" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12" /><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6Z" /><path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5Z" /></svg>
                </span>
                                <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={q ? "" : phPlaceholder} aria-label="Search recipes" />
                            </div>
                            <div className="vn-sform-actions">
                                <button type="button" className="vn-sform-dice" onClick={surprise} aria-label="Surprise me">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none" /></svg>
                                    <span>Surprise me</span>
                                </button>
                                <button type="submit" className="vn-sform-go">Find recipes <span aria-hidden>→</span></button>
                            </div>
                        </form>
                        <div className="vn-chips">
                            <span className="vn-chips-label">I've got…</span>
                            {SEARCH_CHIPS.map((c) => (
                                <button key={c} type="button" className="vn-chip" onClick={() => doSearch(c)}>{c}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {subOpen && (
                <div className="vn-modal-back" onClick={() => setSubOpen(false)}>
                    <div className="vn-modal" role="dialog" aria-modal="true" aria-label="Subscribe to The Dispatch" onClick={(e) => e.stopPropagation()}>
                        <button className="vn-modal-x" aria-label="Close" onClick={() => setSubOpen(false)}>×</button>
                        {subscribed ? (
                            <div className="vn-modal-done">
                                <div className="vn-modal-check">✓</div>
                                <h3>You're on the list.</h3>
                                <p>The next Dispatch will land in your inbox. No spam, no ads — ever.</p>
                                <button className="vn-sub" onClick={() => setSubOpen(false)}>Done</button>
                            </div>
                        ) : (
                            <>
                                <span className="vn-modal-kicker">The Dispatch, in your inbox</span>
                                <h3>New recipes &amp; notes, once a week</h3>
                                <p>The good stuff from the kitchen and the forum — a short weekly email. No ads, no selling your address, unsubscribe in one click.</p>
                                <form onSubmit={submitSubscribe} className="vn-modal-form">
                                    <input
                                        type="email"
                                        value={subEmail}
                                        onChange={(e) => setSubEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        aria-label="Email address"
                                        required
                                    />
                                    <button type="submit" className="vn-sub" disabled={subBusy}>{subBusy ? "Subscribing…" : "Subscribe"}</button>
                                </form>
                                {subErr && <p style={{ color: "#c0392b", margin: "10px 0 0", fontSize: 14 }}>{subErr}</p>}
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}