// src/app/register/page.tsx
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { registerAction } from "./actions";

export const metadata: Metadata = { title: "Create an account — vegan eating" };

export default function RegisterPage({ searchParams }: { searchParams: { error?: string } }) {
    return <AuthForm mode="register" action={registerAction} error={searchParams?.error} />;
}