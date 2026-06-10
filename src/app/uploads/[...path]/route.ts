// src/app/uploads/[...path]/route.ts
//
// Serves files from public/uploads at REQUEST time so that images uploaded
// after a production build are still reachable. `next start` only serves
// public/ assets that existed at build time, so runtime uploads 404 without
// this. In `next dev` the real static file is served first and this handler
// stays dormant — no conflict. On a DigitalOcean Droplet with a persistent
// disk this is all you need; for App Platform's ephemeral fs, swap the read
// below for a fetch from Spaces/S3 (this is the only file that changes).

import type { NextRequest } from "next/server";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";      // fs access requires the Node runtime
export const dynamic = "force-dynamic"; // never cache the route itself

const ROOT = path.join(process.cwd(), "public", "uploads");

const TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".svg": "image/svg+xml",
};

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
    const rel = (params.path || []).join("/");
    const abs = path.join(ROOT, rel);

    // Path-traversal guard: the resolved path must stay inside ROOT.
    if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
        return new Response("Not found", { status: 404 });
    }

    try {
        const s = await stat(abs);
        if (!s.isFile()) return new Response("Not found", { status: 404 });

        const buf = await readFile(abs);
        const ext = path.extname(abs).toLowerCase();

        return new Response(new Uint8Array(buf), {
            status: 200,
            headers: {
                "Content-Type": TYPES[ext] || "application/octet-stream",
                "Content-Length": String(s.size),
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch {
        return new Response("Not found", { status: 404 });
    }
}