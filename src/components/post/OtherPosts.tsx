// src/components/post/OtherPosts.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export type OtherItem = { slug: string; title: string; date: string | null; image: string | null };

function src(s?: string | null): string | null {
    if (!s) return null;
    if (/^https?:\/\//i.test(s) || s.startsWith("/")) return s;
    return "/" + s.replace(/^\.?\//, "");
}

const isExternal = (s: string) => /^https?:\/\//i.test(s);

export default function OtherPosts({
                                       related,
                                       author,
                                       basePath = "/articles",
                                       title = "Other posts",
                                       relatedLabel = "Related Articles",
                                       authorLabel = "More from Author",
                                   }: {
    related: OtherItem[];
    author: OtherItem[];
    basePath?: string;
    title?: string;
    relatedLabel?: string;
    authorLabel?: string;
}) {
    const [tab, setTab] = useState<"related" | "author">("related");
    const items = tab === "related" ? related : author;

    return (
        <section className="art-other">
            <div className="art-other-head">
                <h3 className="art-other-title">{title}</h3>
                <div className="art-other-tabs">
                    <button type="button" className={tab === "related" ? "active" : ""} onClick={() => setTab("related")}>{relatedLabel}</button>
                    <button type="button" className={tab === "author" ? "active" : ""} onClick={() => setTab("author")}>{authorLabel}</button>
                </div>
            </div>
            <div className="art-other-grid">
                {items.map((it) => {
                    const s = src(it.image);
                    return (
                        <Link key={tab + it.slug} href={`${basePath}/${it.slug}`} className="art-other-item">
                            <span className="art-other-thumb">
                                {s ? (
                                    // External publisher images (news) skip next/image so we don't have to
                                    // whitelist every host; local paths keep optimization.
                                    isExternal(s) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={s} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <Image src={s} alt="" fill sizes="130px" style={{ objectFit: "cover" }} />
                                    )
                                ) : (
                                    <span className="art-other-ph" />
                                )}
                            </span>
                            <span className="art-other-meta">
                                <span className="art-other-h">{it.title}</span>
                                {it.date ? <span className="art-other-date">📅 {it.date}</span> : null}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}