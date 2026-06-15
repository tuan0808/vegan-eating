// src/app/(site)/forum/[category]/[forum]/new/page.tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getForumView } from "@/lib/forum";
import { currentUser } from "@/lib/auth-helpers";
import type { CSSProperties } from "react";
import RichEditor from "@/components/RichEditor";
import PageHero from "@/components/PageHero";
import { createThread } from "../../../actions";

export const metadata: Metadata = { title: "New thread — Forums — vegan eating" };

// Maps the ?error=<code> the createThread action can redirect with to a message.
// Note: "signin" and "unverified" never land here — the action sends those to
// /login and /dashboard?verify=1 respectively.
const ERR: Record<string, string> = {
    missing: "Please add a title (at least 3 characters) and a message before posting.",
    cooldown: "You're posting a little fast — give it a minute before starting another thread.",
    hourly: "You've hit the hourly posting limit. Try again later.",
    blocked: "Unable to post from this connection.",
    banned: "Your account is not able to post.",
};

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

    const errorMsg = searchParams.error
        ? ERR[searchParams.error] ?? "Something went wrong. Please try again."
        : null;

    return (
        <>
            <PageHero
                image="/header/forum.jpg"
                minHeight={380}
                breadcrumb={
                    <>
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
                    </>
                }
                title="Start a thread"
                dek={`Posting in ${view.forum.name} as ${user.name ?? user.username ?? "you"}`}
            />

            <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "8px 28px 90px" }}>
                {errorMsg ? (
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
                        {errorMsg}
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