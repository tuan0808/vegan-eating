// src/app/layout.tsx
import type { Metadata } from "next";
import { isMaintenanceBlocked } from "@/lib/maintenance";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";
import "./globals.css";

export const metadata: Metadata = {
    title: "vegan eating — tested plant-based recipes & community",
    description:
        "Eat green, feel green. Honest, tested vegan recipes for everyday cooking, plus a community to cook them with. No ads, no life story.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
        </head>
        <body>{blocked ? <MaintenanceScreen /> : children}</body>
        </html>
    );
}