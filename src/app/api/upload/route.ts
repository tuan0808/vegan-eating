// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// --- Spaces config (all from env; absence => fall back to local disk for dev) ---
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT;      // e.g. https://nyc3.digitaloceanspaces.com
const SPACES_BUCKET = process.env.SPACES_BUCKET;          // e.g. veganeating-media
const SPACES_KEY = process.env.SPACES_KEY;
const SPACES_SECRET = process.env.SPACES_SECRET;
const SPACES_REGION = process.env.SPACES_REGION || "us-east-1"; // Spaces ignores this, but the SDK requires a value
// Public base for returned URLs. Set this to your CDN endpoint, e.g.
//   https://veganeating-media.nyc3.cdn.digitaloceanspaces.com
// Falls back to the virtual-hosted origin if unset.
const SPACES_PUBLIC_BASE =
    process.env.SPACES_PUBLIC_BASE ||
    (SPACES_ENDPOINT && SPACES_BUCKET
        ? SPACES_ENDPOINT.replace("://", `://${SPACES_BUCKET}.`)
        : undefined);

const spacesEnabled = Boolean(SPACES_ENDPOINT && SPACES_BUCKET && SPACES_KEY && SPACES_SECRET);

// One client for the lifetime of the lambda/container.
const s3 = spacesEnabled
    ? new S3Client({
        endpoint: SPACES_ENDPOINT,
        region: SPACES_REGION,
        // virtual-hosted style ( <bucket>.<region>.digitaloceanspaces.com ) is the default & what Spaces wants
        forcePathStyle: false,
        credentials: { accessKeyId: SPACES_KEY!, secretAccessKey: SPACES_SECRET! },
    })
    : null;

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

    // Same key layout in both modes: uploads/<year>/<month>/<filename> (always forward slashes).
    const key = ["uploads", yyyy, mm, filename].join("/");

    // ---------- Production: write to DigitalOcean Spaces (S3) ----------
    if (spacesEnabled && s3 && SPACES_PUBLIC_BASE) {
        try {
            await s3.send(
                new PutObjectCommand({
                    Bucket: SPACES_BUCKET!,
                    Key: key,
                    Body: buf,
                    ContentType: file.type,
                    ACL: "public-read", // images are served straight from the CDN
                    CacheControl: "public, max-age=31536000, immutable",
                }),
            );
        } catch (err) {
            console.error("Spaces upload failed:", err);
            return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
        }
        const publicPath = `${SPACES_PUBLIC_BASE.replace(/\/+$/, "")}/${key}`;
        return NextResponse.json({ path: publicPath });
    }

    // ---------- Dev / no-Spaces: write to public/ exactly as before ----------
    const absDir = path.join(process.cwd(), "public", "uploads", yyyy, mm);
    await mkdir(absDir, { recursive: true });
    await writeFile(path.join(absDir, filename), buf);
    return NextResponse.json({ path: "/" + key });
}