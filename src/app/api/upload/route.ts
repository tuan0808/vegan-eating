// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Build a safe filename: lowercase slug + a short timestamp + a sane extension.
function safeName(original: string): string {
    const ext0 = path.extname(original || "").toLowerCase();
    const ext = /^\.(jpe?g|png|webp|gif|avif)$/.test(ext0) ? ext0 : ".jpg";
    const base =
        path
            .basename(original || "image", path.extname(original || ""))
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "image";
    return `${base}-${Date.now().toString(36)}${ext}`;
}

export async function POST(req: NextRequest) {
    // Admin only — never let an unauthenticated request write files to the server.
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file received." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
        return NextResponse.json({ error: "Only image files are allowed (JPEG, PNG, WebP, GIF, AVIF)." }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "That image is larger than 8 MB." }, { status: 413 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const filename = safeName(file.name);

    // --- the one spot to swap for DigitalOcean Spaces / S3 in production ---
    const relDir = path.join("uploads", yyyy, mm);
    const absDir = path.join(process.cwd(), "public", relDir);
    await mkdir(absDir, { recursive: true });
    await writeFile(path.join(absDir, filename), buf);
    // -----------------------------------------------------------------------

    // Public URL (always forward slashes, even on Windows/WSL path joins).
    const publicPath = "/" + path.join(relDir, filename).split(path.sep).join("/");
    return NextResponse.json({ path: publicPath });
}