// src/app/(auth)/login/page.tsx
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { loginAction, resendVerificationAction } from "./actions";

export const metadata: Metadata = { title: "Log in — vegan eating" };

export default function LoginPage({
                                      searchParams,
                                  }: {
    searchParams: { error?: string; registered?: string; resent?: string };
}) {
    const notice =
        searchParams?.registered === "1"
            ? "registered"
            : searchParams?.resent === "1"
                ? "resent"
                : undefined;

    return (
        <AuthForm
            mode="login"
            action={loginAction}
            error={searchParams?.error}
            notice={notice}
            resendAction={resendVerificationAction}
        />
    );
}