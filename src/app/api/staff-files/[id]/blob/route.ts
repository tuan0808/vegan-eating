// src/app/api/staff-files/[id]/blob/route.ts
// DEV-ONLY byte store for staff files when Spaces isn't configured. In production
// the browser talks to Spaces directly via presigned URLs and this route 404s.
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { prisma } from "@/lib/prisma";
import { fileKind } from "@/lib/staff-files-config";
import { MAX_STAFF_FILE_BYTES, contentDisposition, localPath, spacesEnabled, staffUser, DOWNLOAD_ROLES, UPLOAD_ROLES } from "@/lib/staff-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404 });

// Never active in production, even if Spaces env vars go missing.
const disabled = () => spacesEnabled || process.env.NODE_ENV === "production";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (disabled()) return notFound();
    const user = await staffUser(UPLOAD_ROLES);
    if (!user) return new Response("Not authorized", { status: 403 });
    const { id } = await params;

    const file = await prisma.staffFile.findUnique({ where: { id }, select: { key: true, status: true, uploadedById: true } });
    if (!file || file.status !== "PENDING" || file.uploadedById !== user.id || !req.body) return notFound();

    if (Number(req.headers.get("content-length") ?? 0) > MAX_STAFF_FILE_BYTES) {
        return new Response("Too large", { status: 413 });
    }
    const abs = await localPath(file.key);
    await mkdir(dirname(abs), { recursive: true });
    await pipeline(Readable.fromWeb(req.body as WebReadableStream), createWriteStream(abs));
    return new Response(null, { status: 200 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    if (disabled()) return notFound();
    const user = await staffUser(DOWNLOAD_ROLES);
    if (!user) return notFound();
    const { id } = await params;

    const file = await prisma.staffFile.findUnique({ where: { id }, select: { key: true, name: true, status: true, contentType: true } });
    if (!file || file.status !== "READY") return notFound();
    // ?inline=1 previews allowlisted images. Unlike Spaces, this is OUR origin, so
    // sandbox it in case someone opens an SVG directly.
    const inline = new URL(req.url).searchParams.has("inline") && fileKind(file.contentType) === "image";

    try {
        const abs = await localPath(file.key);
        const s = await stat(abs);
        return new Response(Readable.toWeb(createReadStream(abs)) as ReadableStream, {
            headers: {
                "Content-Type": inline ? file.contentType : "application/octet-stream",
                "Content-Length": String(s.size),
                "Content-Disposition": inline ? "inline" : contentDisposition(file.name),
                ...(inline && { "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:" }),
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return notFound();
    }
}
