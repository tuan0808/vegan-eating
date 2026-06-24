// src/app/(auth)/login/page.tsx
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { loginAction, resendVerificationAction } from "./actions";

export const metadata: Metadata = { title: "Log in — vegan eating" };

export default async function LoginPage({
                                      searchParams,
                                  }: {
    searchParams: Promise<{ error?: string; registered?: string; resent?: string }>;
}) {
    const sp = await searchParams;
    const notice =
        sp?.registered === "1"
            ? "registered"
            : sp?.resent === "1"
                ? "resent"
                : undefined;

    return (
        <AuthForm
            mode="login"
            action={loginAction}
            error={sp?.error}
            notice={notice}
            resendAction={resendVerificationAction}
        />
    );
}