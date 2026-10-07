// src/app/api/staff-files/[id]/route.ts
// Delete a staff file (or cancel a pending upload). STAFF may delete only their own
// files; ADMIN may delete anyone's. MEDIA can't upload, so never owns one.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteStored, staffUser, UPLOAD_ROLES } from "@/lib/staff-files";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await staffUser(UPLOAD_ROLES);
    if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    const { id } = await params;

    const file = await prisma.staffFile.findUnique({ where: { id }, select: { key: true, uploadedById: true } });
    if (!file) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (file.uploadedById !== user.id && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Only the person who uploaded this file can delete it." }, { status: 403 });
    }

    try {
        await deleteStored(file.key);
    } catch (err) {
        console.error("Staff file delete failed:", err);
        return NextResponse.json({ error: "Couldn't delete the stored file." }, { status: 502 });
    }
    await prisma.staffFile.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
