// src/app/api/staff-files/move/route.ts
// Move files into a folder (or back to the top level). Same ownership rule as
// delete: STAFF may move only files they uploaded; ADMIN may move anyone's.
// Folders are DB-only, so this never touches storage.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { staffUser, UPLOAD_ROLES } from "@/lib/staff-files";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const user = await staffUser(UPLOAD_ROLES);
    if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const ids: string[] = Array.isArray(body?.ids) ? [...new Set(body.ids.filter((x: unknown) => typeof x === "string"))] as string[] : [];
    if (ids.length === 0) return NextResponse.json({ error: "Pick at least one file." }, { status: 400 });
    if (ids.length > 500) return NextResponse.json({ error: "Move at most 500 files at a time." }, { status: 400 });
    const folderId = typeof body?.folderId === "string" && body.folderId ? body.folderId : null;

    if (folderId && !(await prisma.staffFolder.findUnique({ where: { id: folderId }, select: { id: true } }))) {
        return NextResponse.json({ error: "That folder no longer exists." }, { status: 404 });
    }

    const files = await prisma.staffFile.findMany({ where: { id: { in: ids } }, select: { id: true, uploadedById: true } });
    if (files.length !== ids.length) return NextResponse.json({ error: "Some of those files no longer exist." }, { status: 404 });
    if (user.role !== "ADMIN" && files.some((f) => f.uploadedById !== user.id)) {
        return NextResponse.json({ error: "You can only move files you uploaded." }, { status: 403 });
    }

    await prisma.staffFile.updateMany({ where: { id: { in: ids } }, data: { folderId } });
    return NextResponse.json({ ok: true, moved: ids.length });
}
