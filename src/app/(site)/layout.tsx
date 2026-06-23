// src/app/(site)/layout.tsx
import Header from "@/components/Header";
import ClientEffects from "@/components/ClientEffects";
import PageTracker from "@/components/analytics/PageTracker";
import { Footer } from "@/components/Sections";

export const dynamic = "force-dynamic";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <PageTracker />
            <Header />
            <ClientEffects />
            <main>{children}</main>
            <Footer />
        </>
    );
}