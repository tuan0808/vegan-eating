// src/app/layout.tsx
import type { Metadata } from "next";
import { isMaintenanceBlocked, getMaintenance } from "@/lib/maintenance";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_DEFAULT_TITLE, siteJsonLdScript } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
    // Makes every relative canonical/OG URL resolve to an absolute one and
    // silences Next's "metadataBase is not set" build warning.
    metadataBase: new URL(SITE_URL),
    title: {
        default: SITE_DEFAULT_TITLE,
        template: `%s — ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    manifest: "/site.webmanifest",
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
            { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    openGraph: {
        type: "website",
        siteName: SITE_NAME,
        title: SITE_DEFAULT_TITLE,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        locale: "en_US",
    },
    twitter: {
        card: "summary_large_image",
        title: SITE_DEFAULT_TITLE,
        description: SITE_DESCRIPTION,
    },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const state = await getMaintenance();
    const blocked = await isMaintenanceBlocked();

    return (
        <html lang="en">
        <head>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link
                href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
                rel="stylesheet"
            />
            {/* Site-wide Organization + WebSite schema (brand identity + sitelinks search box). */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: siteJsonLdScript() }} />
        </head>
        <body>{blocked ? <MaintenanceScreen /> : children}</body>
        </html>
    );
}