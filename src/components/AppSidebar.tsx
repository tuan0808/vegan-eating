// src/components/AppSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMobileNav } from "@/components/MobileNav";
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
const icoMessages = I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>);
const icoCart = I(<><circle cx="9" cy="20" r="1.1" /><circle cx="18" cy="20" r="1.1" /><path d="M2 3h3l2.3 12.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 7H6" /></>);
const icoSettings = I(<><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>);
const icoMembers = I(<><circle cx="9.5" cy="8" r="3.2" /><path d="M3 20c0-3.6 2.9-6.5 6.5-6.5S16 16.4 16 20" /><path d="M16 5.5a3 3 0 0 1 0 5.6" /><path d="M21 20c0-2.6-1.6-4.8-3.8-5.7" /></>);
const icoRecipes = I(<><path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2V5Z" /><path d="M20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2V5Z" /></>);
const icoArticles = I(<><path d="M6 3h9l4 4v14H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5" /><path d="M8.5 13h7M8.5 16.5h7" /></>);
const icoForums = I(<path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20.5l1.9-5.4A8 8 0 1 1 21 11.5Z" />);
const icoModeration = I(<path d="M12 3l7 3v5c0 4.6-3 8.5-7 9.8C8 19.5 5 15.6 5 11V6l7-3Z" />);
const icoSecurity = I(<><rect x="4.5" y="10.5" width="15" height="9" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /><path d="M12 14v2" /></>);
const icoMaintenance = I(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />);
const icoCategories = I(<><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2A2 2 0 0 1 2.8 12V4a1.2 1.2 0 0 1 1.2-1.2H12a2 2 0 0 1 1.4.6l7.2 7.2a2 2 0 0 1 0 2.8Z" /><path d="M7.5 7.5h.01" /></>);
const icoBack = I(<path d="M19 12H5M11 6l-6 6 6 6" />);
const icoChevLeft = I(<path d="M15 6l-6 6 6 6" />);
const icoChevRight = I(<path d="M9 6l6 6-6 6" />);
const icoNews = I(<><path d="M19 20H5a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a2 2 0 0 0 2-2V8" /><path d="M8 8h6M8 11h6M8 14h4" /></>);
const icoVeganize = I(<><path d="M11 21c-4.4 0-7-3-7-8 0-6 5-9 16-9 0 9.4-4 17-9 17Z" /><path d="M9 16c1.6-3.2 4.2-5.3 7.5-6.3" /></>);
const icoAnalytics = I(<><path d="M4 20V4" /><path d="M4 20h16" /><path d="M8 17v-5M12 17V8M16 17v-7" /></>);


const ACCOUNT: Item[] = [
    { href: "/dashboard", label: "Dashboard", icon: icoDashboard },
    { href: "/activity", label: "My activity", icon: icoActivity },
    { href: "/messages", label: "Messages", icon: icoMessages },
    { href: "/shopping-list", label: "Shopping list", icon: icoCart },
    { href: "/settings", label: "Settings", icon: icoSettings },
];

const ADMIN: Item[] = [
    { href: "/admin", label: "Members", icon: icoMembers },
    { href: "/admin/analytics", label: "Analytics", icon: icoAnalytics },
    { href: "/admin/recipes", label: "Recipes", icon: icoRecipes },
    { href: "/admin/categories", label: "Categories", icon: icoCategories },
    { href: "/admin/articles", label: "Articles", icon: icoArticles },
    { href: "/admin/news", label: "News", icon: icoNews },
    { href: "/admin/forums", label: "Forums", icon: icoForums },
    { href: "/admin/comments", label: "Moderation", icon: icoModeration },
    { href: "/admin/veganize", label: "Veganizer", icon: icoVeganize },
    { href: "/admin/security", label: "Security", icon: icoSecurity },
    { href: "/admin/maintenance", label: "Maintenance", icon: icoMaintenance },
];

export default function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
    const path = usePathname();
    const { open: mobileOpen, close } = useMobileNav();
    const [collapsed, setCollapsed] = useState(false);
    const [noti, setNoti] = useState({ unread: 0, pending: 0, inquiries: 0 });

    // Restore the last choice (client-only, so server render stays expanded — no hydration mismatch).
    useEffect(() => {
        if (typeof window !== "undefined" && localStorage.getItem("vn-admin-sidebar") === "collapsed") {
            setCollapsed(true);
        }
    }, []);

    // Close the mobile drawer whenever the route changes (covers nav-item taps,
    // programmatic navigation, and back/forward).
    useEffect(() => {
        close();
    }, [path, close]);

    // Same notification feed the header uses; we paint the counts on the
    // matching items below. Refetch on focus so they freshen.
    useEffect(() => {
        let on = true;
        const load = () => {
            fetch("/api/notifications")
                .then((r) => (r.ok ? r.json() : null))
                .then((n) => {
                    if (on && n) setNoti({ unread: n.unread ?? 0, pending: n.pending ?? 0, inquiries: n.inquiries ?? 0 });
                })
                .catch(() => {});
        };
        load();
        const onFocus = () => { if (document.visibilityState === "visible") load(); };
        window.addEventListener("focus", onFocus);
        return () => { on = false; window.removeEventListener("focus", onFocus); };
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

    // Surface the notification counts on the matching sidebar items.
    const badgeFor = (href?: string) => {
        if (href === "/messages") return noti.unread + noti.inquiries;
        if (href === "/activity") return noti.pending;
        return 0;
    };

    const renderItem = (it: Item) => {
        const b = badgeFor(it.href);
        const inner = (
            <>
                <span className="ico">{it.icon}</span>
                <span className="lbl">{it.label}</span>
                {it.soon && <em className="tag">soon</em>}
                {b > 0 && <span className="noti">{b > 99 ? "99+" : b}</span>}
            </>
        );
        return it.soon || !it.href ? (
            <span key={it.label} className="item soon" title={it.label}>{inner}</span>
        ) : (
            <Link
                key={it.href}
                href={it.href}
                onClick={close}
                className={`item ${isActive(it.href) ? "active" : ""}`}
                title={it.label}
            >
                {inner}
            </Link>
        );
    };

    return (
        <>
            {mobileOpen && (
                <div className="mnav-backdrop" onClick={close} aria-hidden="true" />
            )}

            <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
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
                    <Link href="/" className="back" onClick={close} title="Back to site">
                        <span className="ico">{icoBack}</span>
                        <span className="lbl">Back to site</span>
                    </Link>
                    <p className="mark">vegan eating · admin</p>
                </div>
            </aside>
        </>
    );
}