// src/components/PageHero.tsx
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import HeroTitle from "./HeroTitle";
import "./page-hero.css";

export type HeroMeta = { icon?: ReactNode; value: string; label: string };

/**
 * The fancy full-bleed editorial hero, reusable across pages.
 * Pass an image + title; everything else (breadcrumb, kicker, dek, meta stats,
 * CTA, and an extra slot via children) is optional. Content sits left over a
 * dark-left gradient so the right of the photo shows through.
 */
export default function PageHero({
                                     image,
                                     mobileImage,
                                     imageAlt = "",
                                     breadcrumb,
                                     kicker,
                                     title,
                                     emphasizeTitle = false,
                                     dek,
                                     cta,
                                     meta,
                                     minHeight,
                                     className,
                                     children,
                                 }: {
    image: string;
    /** Optional art for screens ≤980px (e.g. a 16:9 crop of a very wide image). */
    mobileImage?: string;
    imageAlt?: string;
    breadcrumb?: ReactNode;
    kicker?: string;
    /** A string, or rich copy (e.g. campaign text with an italic accent). */
    title: ReactNode;
    /** Render the title with the editorial HeroTitle treatment ("and"/"with" ->
     *  "&" + orange word emphasis) so content titles match recipes/articles. */
    emphasizeTitle?: boolean;
    dek?: ReactNode;
    cta?: { label: string; href: string };
    meta?: HeroMeta[];
    minHeight?: number;
    /** Extra class on the section, for page-scoped tweaks. */
    className?: string;
    children?: ReactNode;
}) {
    return (
        <section className={className ? `phero ${className}` : "phero"} style={minHeight ? { minHeight } : undefined}>
            <div className="phero-bg">
                {mobileImage ? (
                    <>
                        {/* Both render; CSS shows one. The tiny `sizes` on the hidden
                            one keeps the browser from fetching a full-size copy. */}
                        <Image src={image} alt={imageAlt} fill priority sizes="(max-width: 980px) 1px, 100vw" className="phero-img-wide" style={{ objectFit: "cover" }} />
                        <Image src={mobileImage} alt={imageAlt} fill priority sizes="(max-width: 980px) 100vw, 1px" className="phero-img-mobile" style={{ objectFit: "cover" }} />
                    </>
                ) : (
                    <Image src={image} alt={imageAlt} fill priority sizes="100vw" style={{ objectFit: "cover" }} />
                )}
            </div>
            <div className="phero-scrim" />

            <div className="phero-inner">
                <div className="phero-content">
                    {/* Optional trail for nested pages (e.g. Forums / Category / Forum).
                        Pass <Link>s in white; container styling is inlined so
                        page-hero.css doesn't need a new rule. */}
                    {breadcrumb ? (
                        <div
                            className="phero-crumb"
                            style={{ fontSize: 13, marginBottom: 14, color: "rgba(255,255,255,.8)" }}
                        >
                            {breadcrumb}
                        </div>
                    ) : null}

                    {kicker ? (
                        <div className="phero-kicker">
                            <span>{kicker}</span>
                        </div>
                    ) : null}

                    {emphasizeTitle && typeof title === "string" ? (
                        <HeroTitle title={title} className="phero-title" />
                    ) : (
                        <h1 className="phero-title">{title}</h1>
                    )}

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