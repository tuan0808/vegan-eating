// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Single PrismaClient per process. Every `new PrismaClient()` opens its OWN
// connection pool, so on Managed Postgres (limited connection slots) extra
// instances exhaust the cluster — which is what caused the "no connection
// slots" FATAL. We pin one instance on globalThis in BOTH dev (survives
// hot-reload) and prod (guards against the module being evaluated more than
// once across Next.js route-group bundles).
//
// NOTE: actual pool SIZE is controlled by `?connection_limit=` on DATABASE_URL,
// and PgBouncer routing by `?pgbouncer=true` — not in this file.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // surface real errors in the terminal instead of silently crashing
        log: ["error", "warn"],
    });

globalForPrisma.prisma = prisma;