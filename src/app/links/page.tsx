// src/app/links/page.tsx
// Link-in-bio page — the target of the QR code on the business card. Lives
// outside the (site) group on purpose: no header/footer, just a phone-sized
// stack of buttons. Print the QR as /links?src=card so card scans show up as
// their own row in analytics (PageTracker records the query string).
import Link from "next/link";
import "./links.css";
import PageTracker from "@/components/analytics/PageTracker";
import SocialIcon from "@/components/SocialIcon";
import { getSocials } from "@/lib/socials";
import { detectPlatform } from "@/lib/social-platforms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
    title: "Links",
    description: "Find vegan eating on Instagram and everywhere else — recipes, the forum, and our newsletter.",
    path: "/links",
});

// Social buttons are managed in the dashboard (Admin → Socials).
export const dynamic = "force-dynamic";

const site = [
    { label: "Browse recipes", href: "/recipes" },
    { label: "Vegan food near me", href: "/tools/vegan-food-near-me" },
    { label: "Join the forum", href: "/forum" },
    { label: "Contact us", href: "/contact" },
];

export default async function LinksPage() {
    const socials = (await getSocials()).map((href) => ({ href, ...detectPlatform(href) }));

    return (
        <div className="links-page">
            <PageTracker />
            <div className="links-card">
                <Link href="/" aria-label="vegan eating home">
                    <img src="/logo/logo-ink.svg" alt="vegan eating" width={166} height={44} className="links-logo" />
                </Link>
                <p className="links-dek">Eat green, feel green.</p>

                {socials.length > 0 && (
                    <>
                        <h2 className="links-h">Follow along</h2>
                        <ul className="links-list">
                            {socials.map((s) => (
                                <li key={s.href}>
                                    <a className="links-btn links-btn--social" href={s.href} target="_blank" rel="noopener noreferrer">
                                        <SocialIcon platform={s.key} className="links-ico" />
                                        {s.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                <h2 className="links-h">On the site</h2>
                <ul className="links-list">
                    {site.map((s) => (
                        <li key={s.href}><Link className="links-btn" href={s.href}>{s.label}</Link></li>
                    ))}
                    <li className="links-btn links-btn--news"><Link href="/register">Get the newsletter</Link></li>
                </ul>

                <Link href="/" className="links-home">veganeating.com</Link>
            </div>
        </div>
    );
}
