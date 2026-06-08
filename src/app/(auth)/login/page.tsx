// src/app/login/page.tsx
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "Log in — vegan eating" };

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
    return <AuthForm mode="login" action={loginAction} error={searchParams?.error} />;
}