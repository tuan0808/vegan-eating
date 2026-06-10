// src/components/AppSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import "./app-sidebar.css";

type Item = { href?: string; label: string; soon?: boolean; icon: ReactNode };

/* — single-stroke line icons. Self-sizing (width/height on the svg) so they never
     balloon, even before CSS loads. — */
const I = (d: ReactNode) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {d}
    </svg>
);
const icoDashboard = I(<><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>);
const icoActivity = I(<path d="M3 12h3.5l2.5 7 4-15 2.5 8H21" />);
const icoSettings = I(<><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>);
const icoMembers = I(<><circle cx="9.5" cy="8" r="3.2" /><path d="M3 20c0-3.6 2.9-6.5 6.5-6.5S16 16.4 16 20" /><path d="M16 5.5a3 3 0 0 1 0 5.6" /><path d="M21 20c0-2.6-1.6-4.8-3.8-5.7" /></>);
const icoRecipes = I(<><path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2V5Z" /><path d="M20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2V5Z" /></>);
const icoArticles = I(<><path d="M6 3h9l4 4v14H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5" /><path d="M8.5 13h7M8.5 16.5h7" /></>);
const icoForums = I(<path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20.5l1.9-5.4A8 8 0 1 1 21 11.5Z" />);
const icoModeration = I(<path d="M12 3l7 3v5c0 4.6-3 8.5-7 9.8C8 19.5 5 15.6 5 11V6l7-3Z" />);
const icoBack = I(<path d="M19 12H5M11 6l-6 6 6 6" />);
const icoChevLeft = I(<path d="M15 6l-6 6 6 6" />);
const icoChevRight = I(<path d="M9 6l6 6-6 6" />);

const ACCOUNT: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: icoDashboard },
    { label: "My activity", soon: true, icon: icoActivity },
    { label: "Settings", soon: true, icon: icoSettings },
];

const ADMIN: Item[] = [
    { href: "/admin", label: "Members", icon: icoMembers },
    { href: "/admin/recipes", label: "Recipes", icon: icoRecipes },
    { href: "/admin/articles", label: "Articles", icon: icoArticles },
    { href: "/admin/forums", label: "Forums", icon: icoForums },
    { label: "Moderation", soon: true, icon: icoModeration },
];

export default function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
    const path = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    // Restore the last choice (client-only, so server render stays expanded — no hydration mismatch).
    useEffect(() => {
        if (typeof window !== "undefined" && localStorage.getItem("vn-admin-sidebar") === "collapsed") {
            setCollapsed(true);
        }
    }, []);

    const toggle = () =>
        setCollapsed((c) => {
            const next = !c;
            try { localStorage.setItem("vn-admin-sidebar", next ? "collapsed" : "expanded"); } catch {}
            return next;
        });
    // Exact match for section roots so a parent doesn't light up on its children;
    // deeper routes prefix-match so /admin/recipes/[slug]/edit still counts.
    const isActive = (href?: string) => {
        if (!href) return false;
        if (href === "/dashboard" || href === "/admin") return path === href;
        return path === href || path.startsWith(href + "/");
    };

    const renderItem = (it: Item) => {
        const inner = (
            <>
                <span className="ico">{it.icon}</span>
                <span className="lbl">{it.label}</span>
                {it.soon && <em className="tag">soon</em>}
            </>
        );
        return it.soon || !it.href ? (
            <span key={it.label} className="item soon" title={it.label}>{inner}</span>
        ) : (
            <Link key={it.href} href={it.href} className={`item ${isActive(it.href) ? "active" : ""}`} title={it.label}>
                {inner}
            </Link>
        );
    };

    return (
        <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
            <button
                type="button"
                className="rail-toggle"
                onClick={toggle}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                title={collapsed ? "Expand" : "Collapse"}
            >
                <span className="ico">{collapsed ? icoChevRight : icoChevLeft}</span>
            </button>

            <p className="sec">Account</p>
            {ACCOUNT.map(renderItem)}

            {isAdmin ? (
                <>
                    <p className="sec" style={{ marginTop: 22 }}>Admin</p>
                    {ADMIN.map(renderItem)}
                </>
            ) : null}

            <div className="foot">
                <Link href="/" className="back" title="Back to site">
                    <span className="ico">{icoBack}</span>
                    <span className="lbl">Back to site</span>
                </Link>
                <p className="mark">vegan eating · admin</p>
            </div>
        </aside>
    );
}