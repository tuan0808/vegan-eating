// src/components/AppSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href?: string; label: string; soon?: boolean };

const ACCOUNT: Item[] = [
    { href: "/dashboard", label: "Dashboard" },
    { label: "My activity", soon: true },
    { label: "Settings", soon: true },
];

const ADMIN: Item[] = [
    { href: "/admin", label: "Members" },
    { href: "/admin/forums", label: "Forums" },
    { label: "Moderation", soon: true },
];

export default function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
    const path = usePathname();
    const isActive = (href?: string) =>
        !!href && (path === href || (href !== "/dashboard" && path.startsWith(href)));

    const renderItem = (it: Item) =>
        it.soon || !it.href ? (
            <span key={it.label} className="item soon">
        {it.label} <em>soon</em>
      </span>
        ) : (
            <Link key={it.href} href={it.href} className={`item ${isActive(it.href) ? "active" : ""}`}>
                {it.label}
            </Link>
        );

    return (
        <aside className="sidebar">
            <p className="sec">Account</p>
            {ACCOUNT.map(renderItem)}

            {isAdmin ? (
                <>
                    <p className="sec" style={{ marginTop: 22 }}>Admin</p>
                    {ADMIN.map(renderItem)}
                </>
            ) : null}

            <style jsx>{`
                .sidebar {
                    width: 232px;
                    flex-shrink: 0;
                    border-right: 1px solid var(--line, #e6e3da);
                    padding: 30px 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .sec {
                    font-size: 11.5px;
                    font-weight: 700;
                    letter-spacing: 0.12em;
                    text-transform: uppercase;
                    color: var(--muted, #6b7264);
                    margin: 0 0 8px 10px;
                }
                .item {
                    display: block;
                    padding: 9px 12px;
                    border-radius: 10px;
                    font-size: 14.5px;
                    color: var(--ink, #1c2317);
                    text-decoration: none;
                    transition: background 0.14s ease;
                }
                .item:hover {
                    background: rgba(0, 0, 0, 0.04);
                }
                .item.active {
                    background: var(--terra, #c2603a);
                    color: #fff;
                    font-weight: 600;
                }
                .item.soon {
                    color: var(--muted, #6b7264);
                    cursor: default;
                }
                .item.soon em {
                    font-style: normal;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    opacity: 0.65;
                    margin-left: 6px;
                }
                @media (max-width: 760px) {
                    .sidebar {
                        width: 100%;
                        flex-direction: row;
                        flex-wrap: wrap;
                        border-right: none;
                        border-bottom: 1px solid var(--line, #e6e3da);
                        padding: 12px 14px;
                        gap: 6px;
                    }
                    .sec {
                        display: none;
                    }
                }
            `}</style>
        </aside>
    );
}