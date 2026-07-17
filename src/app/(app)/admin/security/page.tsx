// src/app/(app)/admin/security/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth-helpers";
import AntiSpamPanel from "@/components/admin/AntiSpamPanel";
import SuspiciousAccounts from "@/components/admin/SuspiciousAccounts";
import DuplicateSignups from "@/components/admin/DuplicateSignups";
import IpActivityList from "@/components/admin/IpActivityList";
import VeganizeLimits from "@/components/admin/VeganizeLimits";

export const metadata: Metadata = { title: "Security — vegan eating" };

export default async function SecurityPage() {
    const user = await currentUser();
    if (user?.role !== "ADMIN") redirect("/");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <AntiSpamPanel />
            <VeganizeLimits />
            <SuspiciousAccounts />
            <DuplicateSignups />
            <IpActivityList />
        </div>
    );
}