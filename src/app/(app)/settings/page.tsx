// src/app/(app)/settings/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { myProfileRecord } from "@/lib/community";
import AccountForm from "./account-form";
import "@/styles/community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Settings — vegan eating" };

export default async function SettingsPage() {
    const session = await requireUser();
    const me = await myProfileRecord(session.id);
    if (!me) return null;

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">Settings</p>
            <h1 className="cm-h1">Account settings</h1>
            <p className="cm-sub">
                Manage how you sign in. To change your name, avatar or bio,{" "}
                <Link href="/profile" style={{ color: "var(--accent,#5b6b3f)", fontWeight: 600 }}>
                    edit your profile
                </Link>
                .
            </p>

            <AccountForm defaultEmail={me.email} />

            <div className="cm-sec">
                <h2>Password</h2>
            </div>
            <div className="cm-empty">
                Password change wires into your existing hashing util — tell me which one your
                sign-up uses (bcrypt? argon?) and I&apos;ll drop in the change-password action.
            </div>
        </div>
    );
}