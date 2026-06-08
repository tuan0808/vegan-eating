// src/app/login/actions.ts
"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

export async function loginAction(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
        await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    } catch (error) {
        // A successful signIn throws a redirect (NOT an AuthError) that must propagate.
        if (error instanceof AuthError) {
            redirect("/login?error=invalid");
        }
        throw error;
    }
}