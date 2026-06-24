// src/app/(app)/settings/reset-password/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { peekPasswordResetToken } from "@/lib/password-reset";
import ResetPasswordForm from "./ResetPasswordForm";
import "@/styles/community.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reset password — vegan eating" };

export default async function ResetPasswordPage({
    searchParams,
}: {
    searchParams?: Promise<{ token?: string }>;
}) {
    // The (app) layout already requires login; this re-binds the token to the
    // signed-in user so a leaked link can't be used from someone else's session.
    const me = await requireUser();
    const sp = await searchParams;
    const token = sp?.token ?? "";
    const peek = token ? await peekPasswordResetToken(token) : { status: "invalid" as const };
    const valid = peek.status === "valid" && peek.userId === me.id;

    return (
        <div className="cm cm-wide">
            <p className="cm-kicker">Settings</p>
            <h1 className="cm-h1">Choose a new password</h1>

            {valid ? (
                <>
                    <p className="cm-sub">
                        Email confirmed. Set a new password for your account below.
                    </p>
                    <ResetPasswordForm token={token} />
                </>
            ) : (
                <>
                    <p className="cm-sub">
                        {peek.status === "expired"
                            ? "This reset link has expired."
                            : "This reset link is invalid or has already been used."}
                    </p>
                    <div className="cm-empty">
                        Head back to{" "}
                        <Link
                            href="/settings"
                            style={{ color: "var(--accent,#5b6b3f)", fontWeight: 600 }}
                        >
                            settings
                        </Link>{" "}
                        and request a fresh link.
                    </div>
                </>
            )}
        </div>
    );
}
