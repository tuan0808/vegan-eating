// src/app/articles/[slug]/OtherPosts.tsx
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

export default function OtherPosts({ related, author }: { related: OtherItem[]; author: OtherItem[] }) {
    const [tab, setTab] = useState<"related" | "author">("related");
    const items = tab === "related" ? related : author;

    return (
        <section className="art-other">
            <div className="art-other-head">
                <h3 className="art-other-title">Other posts</h3>
                <div className="art-other-tabs">
                    <button type="button" className={tab === "related" ? "active" : ""} onClick={() => setTab("related")}>Related Articles</button>
                    <button type="button" className={tab === "author" ? "active" : ""} onClick={() => setTab("author")}>More from Author</button>
                </div>
            </div>
            <div className="art-other-grid">
                {items.map((it) => {
                    const s = src(it.image);
                    return (
                        <Link key={tab + it.slug} href={`/articles/${it.slug}`} className="art-other-item">
              <span className="art-other-thumb">
                {s ? <Image src={s} alt="" fill sizes="130px" style={{ objectFit: "cover" }} /> : <span className="art-other-ph" />}
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