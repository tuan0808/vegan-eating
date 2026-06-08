// src/app/(site)/forum/[category]/[forum]/new/page.tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getForumView } from "@/lib/forum";
import { currentUser } from "@/lib/auth-helpers";
import type { CSSProperties } from "react";
import RichEditor from "@/components/RichEditor";
import { createThread } from "../../../actions";

export const metadata: Metadata = { title: "New thread — Forums — vegan eating" };

const labelStyle: CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--muted, #6b7264)",
    marginBottom: 8,
};

const inputStyle: CSSProperties = {
    width: "100%",
    background: "#faf8f1",
    border: "1px solid var(--line, #e6e3da)",
    borderRadius: 12,
    padding: "13px 15px",
    fontSize: 16,
    color: "var(--ink, #1c2317)",
    fontFamily: "inherit",
};

const btnStyle: CSSProperties = {
    background: "var(--terra, #c2603a)",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "12px 26px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
};

export default async function NewThreadPage({
                                                params,
                                                searchParams,
                                            }: {
    params: { category: string; forum: string };
    searchParams: { error?: string };
}) {
    const user = await currentUser();
    if (!user) redirect("/login");

    const view = await getForumView(params.category, params.forum);
    if (!view) notFound();

    return (
        <>
            <section className="recipe-hero">
                <div className="hero-bg">
                    <div className="ph p3" />
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            background: "linear-gradient(180deg, rgba(20,30,20,.35), rgba(20,30,20,.62))",
                        }}
                    />
                </div>
                <div className="wrap" style={{ position: "relative", zIndex: 2, color: "#fff" }}>
                    <div style={{ fontSize: 13, marginBottom: 14, color: "rgba(255,255,255,.8)" }}>
                        <Link href="/forum" style={{ color: "rgba(255,255,255,.85)" }}>Forums</Link>
                        <span style={{ margin: "0 8px" }}>/</span>
                        <span>{view.category.name}</span>
                        <span style={{ margin: "0 8px" }}>/</span>
                        <Link
                            href={`/forum/${view.category.slug}/${view.forum.slug}`}
                            style={{ color: "rgba(255,255,255,.85)" }}
                        >
                            {view.forum.name}
                        </Link>
                    </div>
                    <h1 style={{ marginTop: 4, maxWidth: 760 }}>Start a thread</h1>
                    <p className="dek" style={{ color: "rgba(255,255,255,.92)" }}>
                        Posting in {view.forum.name} as {user.name ?? user.username ?? "you"}
                    </p>
                </div>
            </section>

            <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "8px 28px 90px" }}>
                {searchParams.error ? (
                    <p
                        style={{
                            background: "#fbeae5",
                            border: "1px solid #e7c3b6",
                            color: "#8a3b22",
                            borderRadius: 10,
                            padding: "10px 14px",
                            fontSize: 14,
                            marginBottom: 18,
                        }}
                    >
                        Please add a title (at least 3 characters) and a message before posting.
                    </p>
                ) : null}

                <form action={createThread}>
                    <input type="hidden" name="categorySlug" value={view.category.slug} />
                    <input type="hidden" name="forumSlug" value={view.forum.slug} />

                    {/* Honeypot — hidden from people, irresistible to dumb bots. Leave empty. */}
                    <div aria-hidden style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
                        <label>
                            Website
                            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                        </label>
                    </div>

                    <label style={labelStyle}>Title</label>
                    <input
                        name="title"
                        type="text"
                        required
                        maxLength={140}
                        placeholder="What's your thread about?"
                        style={inputStyle}
                    />

                    <label style={{ ...labelStyle, marginTop: 18 }}>Message</label>
                    <RichEditor name="body" placeholder="Write your opening post…" />

                    <div style={{ display: "flex", gap: 16, marginTop: 20, alignItems: "center" }}>
                        <button type="submit" style={btnStyle}>Post thread</button>
                        <Link
                            href={`/forum/${view.category.slug}/${view.forum.slug}`}
                            style={{ color: "var(--muted, #6b7264)", fontSize: 14 }}
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </>
    );
}