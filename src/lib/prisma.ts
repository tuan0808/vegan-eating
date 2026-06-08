// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot-reloads (dev) and module loads.
// Without this guard, Next.js can spin up multiple query engines against the
// same SQLite file, which leads to "database is locked" / engine panics and
// the server dying after the first request.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // surface real errors in the terminal instead of silently crashing
        log: ["error", "warn"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}