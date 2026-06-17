// src/app/(site)/layout.tsx
import Header from "@/components/Header";
import ClientEffects from "@/components/ClientEffects";
import { Footer } from "@/components/Sections";

export const dynamic = "force-dynamic";
export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Header />
            <ClientEffects />
            <main>{children}</main>
            <Footer />
        </>
    );
}