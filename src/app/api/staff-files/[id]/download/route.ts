// src/app/api/staff-files/[id]/download/route.ts
// Role-checked download: redirects to a 15-minute presigned URL so the (possibly
// multi-GB) bytes stream from Spaces, not through the app server.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOWNLOAD_ROLES, downloadUrl, staffUser } from "@/lib/staff-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await staffUser(DOWNLOAD_ROLES);
    if (!user) return new Response("Not found", { status: 404 });
    const { id } = await params;

    const file = await prisma.staffFile.findUnique({ where: { id }, select: { key: true, name: true, status: true } });
    if (!file || file.status !== "READY") return new Response("Not found", { status: 404 });

    const url = await downloadUrl(id, file.key, file.name);
    const res = NextResponse.redirect(new URL(url, req.url), 302);
    res.headers.set("Cache-Control", "no-store");
    res.headers.set("Referrer-Policy", "no-referrer");
    return res;
}
