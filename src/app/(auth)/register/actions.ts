// src/app/register/actions.ts
"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

const USERNAME_RE = /^[A-Za-z0-9_]{3,24}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    // Lightweight validation (no extra deps).
    if (!name || name.length > 60) redirect("/register?error=invalid");
    if (!USERNAME_RE.test(username)) redirect("/register?error=invalid");
    if (!EMAIL_RE.test(email)) redirect("/register?error=invalid");
    if (password.length < 8 || password.length > 100) redirect("/register?error=invalid");

    const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
        select: { id: true },
    });
    if (existing) redirect("/register?error=taken");

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
        data: { name, username, email, password: hash, role: "MEMBER" },
    });

    // Log the new member straight in.
    try {
        await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    } catch (error) {
        if (error instanceof AuthError) {
            // Account exists now, so send them to log in manually if auto sign-in hiccups.
            redirect("/login");
        }
        throw error;
    }
}