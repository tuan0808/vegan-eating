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
            async authorize(raw, request) {
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

                // Record last-login time + IP (best-effort; never block login on it).
                // The client IP is the first hop in x-forwarded-for behind DO's proxy.
                const fwd = request?.headers?.get("x-forwarded-for") ?? "";
                const ip = fwd.split(",")[0].trim() || request?.headers?.get("x-real-ip") || null;
                await prisma.user
                    .update({
                        where: { id: user.id },
                        data: { lastLoginAt: new Date(), ...(ip ? { lastLoginIp: ip } : {}) },
                    })
                    .catch(() => {});

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