// src/app/register/page.tsx
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { registerAction } from "./actions";

export const metadata: Metadata = { title: "Create an account — vegan eating" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const sp = await searchParams;
    return <AuthForm mode="register" action={registerAction} error={sp?.error} />;
}