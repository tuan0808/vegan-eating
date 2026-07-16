// src/app/(auth)/login/page.tsx
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import RedditEvent from "@/components/analytics/RedditEvent";
import { loginAction, resendVerificationAction } from "./actions";

export const metadata: Metadata = { title: "Log in — vegan eating" };

export default async function LoginPage({
                                      searchParams,
                                  }: {
    searchParams: Promise<{ error?: string; registered?: string; resent?: string; sc?: string }>;
}) {
    const sp = await searchParams;
    const notice =
        sp?.registered === "1"
            ? "registered"
            : sp?.resent === "1"
                ? "resent"
                : undefined;

    // Just registered → fire the Reddit pixel SignUp here (register is a server
    // action that redirects, so the browser never sees the signup page). `sc` is
    // the conversion id from the server-side CAPI event, so the two are deduped.
    const signupConversionId = sp?.registered === "1" ? sp?.sc : undefined;

    return (
        <>
            {signupConversionId && (
                <RedditEvent event="SignUp" conversionId={signupConversionId} />
            )}
            <AuthForm
                mode="login"
                action={loginAction}
                error={sp?.error}
                notice={notice}
                resendAction={resendVerificationAction}
            />
        </>
    );
}