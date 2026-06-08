// src/middleware.ts
// Runs the Edge-safe config (no Prisma) to gate /dashboard and /admin.
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
    matcher: ["/dashboard/:path*", "/admin/:path*"],
};