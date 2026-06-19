// src/components/AuthForm.tsx
"use client";

import Link from "next/link";
import Script from "next/script";

type Props = {
    mode: "login" | "register";
    action: (formData: FormData) => void | Promise<void>;
    error?: string;
    /** Info-styled banner (not an error). e.g. "registered" | "resent". Login only. */
    notice?: string;
    /** Server action for re-sending a verification link. Passed by the login page. */
    resendAction?: (formData: FormData) => void | Promise<void>;
};

const MESSAGES: Record<string, string> = {
    invalid: "That email and password didn't match. Try again.",
    taken: "An account with that email or username already exists.",
    captcha: "Please complete the verification check and try again.",
    unverified:
        "Almost there — please verify your email before logging in. We emailed you a link when you signed up; check your inbox and spam. Need a fresh one? Resend it below.",
};

const NOTICES: Record<string, string> = {
    registered:
        "Account created! We've emailed you a verification link — click it to confirm your address, then log in.",
    resent: "If that account still needs verifying, we've sent a fresh link. Check your inbox.",
};

export default function AuthForm({ mode, action, error, notice, resendAction }: Props) {
    const isRegister = mode === "register";
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    // Offer the resend button when someone's clearly mid-verification: either they
    // just registered, or they tried to log in unverified. Reuses the email field
    // already on the form via the button's formAction (no second input needed).
    const showResend =
        !isRegister && !!resendAction && (error === "unverified" || notice === "registered");

    return (
        <div className="auth-wrap">
            <div className="card">
                <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
                <p className="sub">
                    {isRegister
                        ? "Join the community to post, reply, and save recipes."
                        : "Log in to pick up where you left off."}
                </p>

                {notice ? <p className="notice">{NOTICES[notice] ?? null}</p> : null}
                {error ? <p className="err">{MESSAGES[error] ?? "Something went wrong. Try again."}</p> : null}

                <form action={action} className="form">
                    {isRegister ? (
                        <>
                            <label>
                                <span>Display name</span>
                                <input name="name" type="text" autoComplete="name" required maxLength={60} />
                            </label>
                            <label>
                                <span>Username</span>
                                <input
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    minLength={3}
                                    maxLength={24}
                                    pattern="[A-Za-z0-9_]+"
                                    title="Letters, numbers, and underscores only"
                                />
                            </label>
                        </>
                    ) : null}

                    <label>
                        <span>Email</span>
                        <input name="email" type="email" autoComplete="email" required />
                    </label>

                    <label>
                        <span>Password</span>
                        <input
                            name="password"
                            type="password"
                            autoComplete={isRegister ? "new-password" : "current-password"}
                            required
                            minLength={isRegister ? 8 : undefined}
                        />
                    </label>

                    {/* Cloudflare Turnstile — register only, and only once a site key is configured.
                        The widget auto-injects a hidden `cf-turnstile-response` field the action reads. */}
                    {isRegister && siteKey ? (
                        <>
                            <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                            <div className="captcha">
                                <div className="cf-turnstile" data-sitekey={siteKey} />
                            </div>
                        </>
                    ) : null}

                    <button type="submit">{isRegister ? "Create account" : "Log in"}</button>

                    {/* Resend submits THIS form's email to resendAction instead of the login
                        action. formNoValidate lets it fire without a password filled in. */}
                    {showResend ? (
                        <button
                            type="submit"
                            className="secondary"
                            formAction={resendAction}
                            formNoValidate
                        >
                            Resend verification email
                        </button>
                    ) : null}
                </form>

                <p className="foot">
                    {isRegister ? (
                        <>Already have an account? <Link href="/login">Log in</Link></>
                    ) : (
                        <>New here? <Link href="/register">Create an account</Link></>
                    )}
                </p>
            </div>

            <style jsx>{`
                .auth-wrap {
                    width: 100%;
                    max-width: 440px;
                    padding: 0 20px;
                }
                .card {
                    background: #faf8f1;
                    border: 1px solid var(--line, #e6e3da);
                    border-radius: 18px;
                    padding: 36px 34px;
                }
                h1 {
                    font-family: var(--display, "Fraunces", serif);
                    font-size: 28px;
                    color: var(--ink, #1c2317);
                    margin: 0;
                }
                .sub {
                    color: var(--muted, #6b7264);
                    font-size: 14.5px;
                    margin: 8px 0 22px;
                }
                .err {
                    background: rgba(194, 96, 58, 0.1);
                    border: 1px solid rgba(194, 96, 58, 0.35);
                    color: #9a3f1f;
                    font-size: 14px;
                    border-radius: 10px;
                    padding: 10px 14px;
                    margin: 0 0 18px;
                }
                .notice {
                    background: rgba(47, 125, 56, 0.09);
                    border: 1px solid rgba(47, 125, 56, 0.32);
                    color: var(--olive, #225f27);
                    font-size: 14px;
                    line-height: 1.5;
                    border-radius: 10px;
                    padding: 10px 14px;
                    margin: 0 0 18px;
                }
                .form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                label {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                label span {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--ink, #1c2317);
                }
                input {
                    border: 1px solid var(--line, #d9d5c8);
                    border-radius: 10px;
                    padding: 11px 13px;
                    font-size: 15px;
                    background: #fff;
                    color: var(--ink, #1c2317);
                    outline: none;
                    transition: border-color 0.15s ease;
                }
                input:focus {
                    border-color: var(--terra, #c2603a);
                }
                .captcha {
                    min-height: 65px;
                }
                button {
                    margin-top: 6px;
                    background: var(--terra, #c2603a);
                    color: #fff;
                    border: none;
                    border-radius: 999px;
                    padding: 13px 20px;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: filter 0.15s ease;
                }
                button:hover {
                    filter: brightness(0.95);
                }
                .secondary {
                    margin-top: 2px;
                    background: transparent;
                    color: var(--terra, #c2603a);
                    border: 1px solid var(--terra, #c2603a);
                }
                .secondary:hover {
                    filter: none;
                    background: rgba(47, 125, 56, 0.06);
                }
                .foot {
                    margin: 22px 0 0;
                    font-size: 14px;
                    color: var(--muted, #6b7264);
                    text-align: center;
                }
                .foot :global(a) {
                    color: var(--terra, #c2603a);
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
}