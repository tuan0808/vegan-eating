// src/components/PageHero.tsx
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import "./page-hero.css";

export type HeroMeta = { icon?: ReactNode; value: string; label: string };

/**
 * The fancy full-bleed editorial hero, reusable across pages.
 * Pass an image + title; everything else (kicker, dek, meta stats, CTA, and an
 * extra slot via children) is optional. Content sits left over a dark-left
 * gradient so the right of the photo shows through.
 */
export default function PageHero({
                                     image,
                                     imageAlt = "",
                                     kicker,
                                     title,
                                     dek,
                                     cta,
                                     meta,
                                     minHeight,
                                     children,
                                 }: {
    image: string;
    imageAlt?: string;
    kicker?: string;
    title: string;
    dek?: string;
    cta?: { label: string; href: string };
    meta?: HeroMeta[];
    minHeight?: number;
    children?: ReactNode;
}) {
    return (
        <section className="phero" style={minHeight ? { minHeight } : undefined}>
            <div className="phero-bg">
                <Image src={image} alt={imageAlt} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
            </div>
            <div className="phero-scrim" />

            <div className="phero-inner">
                <div className="phero-content">
                    {kicker ? (
                        <div className="phero-kicker">
                            <span>{kicker}</span>
                        </div>
                    ) : null}

                    <h1 className="phero-title">{title}</h1>

                    {dek ? <p className="phero-dek">{dek}</p> : null}

                    {meta && meta.length ? (
                        <div className="phero-meta">
                            {meta.map((m, i) => (
                                <span className="phero-meta-item" key={i}>
                  {m.icon}
                                    <span>
                    <strong>{m.value}</strong> {m.label}
                  </span>
                </span>
                            ))}
                        </div>
                    ) : null}

                    {cta ? (
                        <Link href={cta.href} className="phero-cta">
                            {cta.label}
                        </Link>
                    ) : null}

                    {children}
                </div>
            </div>
        </section>
    );
}