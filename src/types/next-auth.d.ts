// src/types/next-auth.d.ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface User {
        role?: string;
        username?: string | null;
    }
    interface Session {
        user: {
            id: string;
            role: string;
            username: string | null;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: string;
        username?: string | null;
    }
}