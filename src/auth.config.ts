// src/auth.config.ts
// Edge-safe config: NO Prisma, NO bcrypt here. This is what middleware uses.
import type { NextAuthConfig } from "next-auth";

const authConfig: NextAuthConfig = {
    trustHost: true, // needed behind proxies / on DigitalOcean later; harmless in dev
    pages: { signIn: "/login" },
    session: { strategy: "jwt" },
    providers: [], // credentials provider is added in auth.ts (it needs Node + Prisma)
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isProtected =
                nextUrl.pathname.startsWith("/dashboard") || nextUrl.pathname.startsWith("/admin");
            if (isProtected && !isLoggedIn) return false; // -> redirected to /login
            return true;
        },
        jwt({ token, user }) {
            if (user) {
                token.id = user.id as string;
                token.role = user.role ?? "MEMBER";
                token.username = user.username ?? null;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = (token.id as string) ?? "";
                session.user.role = (token.role as string) ?? "MEMBER";
                session.user.username = (token.username as string | null) ?? null;
            }
            return session;
        },
    },
};

export default authConfig;