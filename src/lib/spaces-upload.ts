// src/lib/spaces-upload.ts
// Stores a PNG buffer for AI-generated recipe images. Mirrors the storage logic
// of src/app/api/upload/route.ts so AI images live on the same CDN in production
// and fall back to public/ in dev — identical behaviour to manual uploads.

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT;
const SPACES_BUCKET = process.env.SPACES_BUCKET;
const SPACES_KEY = process.env.SPACES_KEY;
const SPACES_SECRET = process.env.SPACES_SECRET;
const SPACES_REGION = process.env.SPACES_REGION || "us-east-1"; // Spaces ignores this; SDK requires a value

// Same precedence as the upload route, with NEXT_PUBLIC_MEDIA_BASE_URL accepted
// as a fallback in case that's the one set in this environment.
const SPACES_PUBLIC_BASE =
    process.env.SPACES_PUBLIC_BASE ||
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
    (SPACES_ENDPOINT && SPACES_BUCKET
        ? SPACES_ENDPOINT.replace("://", `://${SPACES_BUCKET}.`)
        : undefined);

const spacesEnabled = Boolean(SPACES_ENDPOINT && SPACES_BUCKET && SPACES_KEY && SPACES_SECRET);

let _s3: S3Client | null = null;
function s3(): S3Client {
    if (!_s3) {
        _s3 = new S3Client({
            endpoint: SPACES_ENDPOINT,
            region: SPACES_REGION,
            forcePathStyle: false, // virtual-hosted style — what Spaces wants
            credentials: { accessKeyId: SPACES_KEY!, secretAccessKey: SPACES_SECRET! },
        });
    }
    return _s3;
}

// key looks like: uploads/recipes/<slug>/ai/hero-<ts>.png  (always forward slashes)
export async function uploadPngToSpaces(
    buffer: Buffer,
    key: string
): Promise<{ key: string; url: string }> {
    // ---------- Production: DigitalOcean Spaces ----------
    if (spacesEnabled && SPACES_PUBLIC_BASE) {
        await s3().send(
            new PutObjectCommand({
                Bucket: SPACES_BUCKET!,
                Key: key,
                Body: buffer,
                ContentType: "image/png",
                ACL: "public-read",
                CacheControl: "public, max-age=31536000, immutable",
            })
        );
        return { key, url: `${SPACES_PUBLIC_BASE.replace(/\/+$/, "")}/${key}` };
    }

    // ---------- Dev / no Spaces: write to public/ so it serves at /<key> ----------
    const abs = path.join(process.cwd(), "public", ...key.split("/"));
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
    return { key, url: "/" + key };
}

// Loads an existing image (Spaces URL in prod, /public path in dev) into a buffer
// so it can be used as the reference for "Match current photo" generation.
export async function loadImageBuffer(
    src: string
): Promise<{ buffer: Buffer; contentType: string; name: string }> {
    const clean = (src || "").trim();
    const ext = (clean.split("?")[0].match(/\.(png|jpe?g|webp|gif|avif)$/i)?.[1] || "png").toLowerCase();
    const typeMap: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
        avif: "image/avif",
    };
    const contentType = typeMap[ext] || "image/png";
    const name = `reference.${ext === "jpg" ? "jpeg" : ext}`;

    if (/^https?:\/\//i.test(clean)) {
        const res = await fetch(clean);
        if (!res.ok) throw new Error(`Could not fetch reference image (${res.status})`);
        return { buffer: Buffer.from(await res.arrayBuffer()), contentType, name };
    }

    // local path under public/  (e.g. /uploads/2025/01/photo.jpg)
    const rel = clean.replace(/^\/+/, "");
    const abs = path.join(process.cwd(), "public", ...rel.split("/"));
    return { buffer: await readFile(abs), contentType, name };
}