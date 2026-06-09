// src/app/(app)/dashboard/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import "./dashboard.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard — vegan eating" };

function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
}

/* — small inline icons. They carry their own width/height so they render
     correctly even if the stylesheet hasn't loaded. — */
const IcoBook = (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2V5Z" />
        <path d="M20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2V5Z" />
    </svg>
);
const IcoPeople = (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9.5" cy="8" r="3.2" />
        <path d="M3 20c0-3.6 2.9-6.5 6.5-6.5S16 16.4 16 20" />
        <path d="M16 5.5a3 3 0 0 1 0 5.6" />
        <path d="M21 20c0-2.6-1.6-4.8-3.8-5.7" />
    </svg>
);
const IcoChat = (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20.5l1.9-5.4A8 8 0 1 1 21 11.5Z" />
    </svg>
);
const IcoGlobe = (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.8 2.6 2.8 15.4 0 18M12 3c-2.8 2.6-2.8 15.4 0 18" />
    </svg>
);
const Arrow = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
);

type Action = { href: string; title: string; desc: string; icon: React.ReactNode; external?: boolean };

const ADMIN_ACTIONS: Action[] = [
    { href: "/admin/recipes", title: "Edit recipes", desc: "Search the library and update any recipe.", icon: IcoBook },
    { href: "/admin", title: "Members", desc: "Manage accounts and roles.", icon: IcoPeople },
    { href: "/admin/forums", title: "Forums", desc: "Moderate threads and replies.", icon: IcoChat },
    { href: "/", title: "View the site", desc: "Open the front of house.", icon: IcoGlobe, external: true },
];

const MEMBER_ACTIONS: Action[] = [
    { href: "/recipes", title: "Browse recipes", desc: "Find something to cook tonight.", icon: IcoBook },
    { href: "/articles", title: "Read the journal", desc: "Long reads on eating green.", icon: IcoGlobe },
];

export default async function DashboardPage() {
    const user = await requireUser();
    const isAdmin = user.role === "ADMIN";

    let stats: { recipes: number; articles: number; members: number } | null = null;
    if (isAdmin) {
        const [recipes, articles, members] = await Promise.all([
            prisma.recipe.count(),
            prisma.article.count(),
            prisma.user.count(),
        ]);
        stats = { recipes, articles, members };
    }

    const actions = isAdmin ? ADMIN_ACTIONS : MEMBER_ACTIONS;
    const fmt = (n: number) => n.toLocaleString();

    return (
        <div className="dash">
            <p className="dash-eyebrow">{isAdmin ? "Back of house" : "Your account"}</p>
            <h1 className="dash-greeting">
                {greeting()}, {user.name ?? user.username}
            </h1>
            <p className="dash-sub">
                Signed in as <strong>{user.email}</strong>
                <span className="dash-pill">{user.role}</span>
            </p>

            {isAdmin && stats && (
                <>
                    <div className="dash-sec"><h2>The library</h2></div>
                    <div className="dash-stats">
                        <div className="stat">
                            <span className="stat-num">{fmt(stats.recipes)}</span>
                            <span className="stat-rule" />
                            <span className="stat-label">Recipes</span>
                            <span className="stat-note">Published in the library</span>
                        </div>
                        <div className="stat">
                            <span className="stat-num">{fmt(stats.articles)}</span>
                            <span className="stat-rule" />
                            <span className="stat-label">Articles</span>
                            <span className="stat-note">Long-form journal pieces</span>
                        </div>
                        <div className="stat">
                            <span className="stat-num">{fmt(stats.members)}</span>
                            <span className="stat-rule" />
                            <span className="stat-label">Members</span>
                            <span className="stat-note">Registered accounts</span>
                        </div>
                    </div>
                </>
            )}

            <div className="dash-sec"><h2>{isAdmin ? "Jump back in" : "Get started"}</h2></div>
            <div className="dash-actions">
                {actions.map((a) => (
                    <Link
                        key={a.href}
                        href={a.href}
                        className="action"
                        {...(a.external ? { target: "_blank", rel: "noopener" } : {})}
                    >
                        <span className="action-ico">{a.icon}</span>
                        <span className="action-body">
              <span className="action-title">{a.title}</span>
              <span className="action-desc">{a.desc}</span>
            </span>
                        <span className="action-arrow">{Arrow}</span>
                    </Link>
                ))}
            </div>

            {!isAdmin && (
                <p className="dash-foot-note">
                    Your threads, replies, and profile settings will live here soon.
                </p>
            )}
        </div>
    );
}