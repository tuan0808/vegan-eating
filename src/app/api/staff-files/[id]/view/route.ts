// src/app/api/staff-files/[id]/view/route.ts
// Role-checked inline preview for image files (thumbnails + the preview modal).
// Redirects to a short-lived presigned URL like /download, but only for the
// PREVIEW_IMAGE_TYPES allowlist; videos and everything else stay download-only.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fileKind } from "@/lib/staff-files-config";
import { DOWNLOAD_ROLES, staffUser, viewUrl } from "@/lib/staff-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await staffUser(DOWNLOAD_ROLES);
    if (!user) return new Response("Not found", { status: 404 });
    const { id } = await params;

    const file = await prisma.staffFile.findUnique({ where: { id }, select: { key: true, status: true, contentType: true } });
    if (!file || file.status !== "READY" || fileKind(file.contentType) !== "image") return new Response("Not found", { status: 404 });

    const url = await viewUrl(id, file.key, file.contentType);
    const res = NextResponse.redirect(new URL(url, req.url), 302);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
}
