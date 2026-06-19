// src/auth.ts
// Full Node-side auth: DB + bcrypt live here. bcrypt is imported lazily inside
// authorize() so it never gets bundled toward the Edge middleware.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(raw) {
                const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
                const password = typeof raw?.password === "string" ? raw.password : "";
                if (!email || !password) return null;

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !user.password) return null; // no account, or OAuth-only account

                const bcrypt = (await import("bcryptjs")).default; // lazy: keeps it out of Edge graph
                const ok = await bcrypt.compare(password, user.password);
                if (!ok) return null;

                // GATE: no session is ever issued for an unverified email. This is the
                // single source of truth — any caller of signIn("credentials") is covered,
                // not just the login form. The friendly "verify first" message is produced
                // in loginAction; here we just refuse. (Returning null is free — the bcrypt
                // check already ran, so this adds no extra work.)
                if (!user.emailVerified) return null;

                // Optional, recommended one-liner to also lock out banned accounts at login:
                // if (user.banned) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name ?? user.username,
                    role: user.role,
                    username: user.username,
                };
            },
        }),
    ],
});