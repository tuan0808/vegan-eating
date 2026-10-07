// src/app/api/staff-files/[id]/complete/route.ts
// Step 3 of a staff upload: confirm the bytes actually landed (and match the
// declared size) before the file appears in Downloads.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_STAFF_FILE_BYTES, deleteStored, staffUser, storedSize, UPLOAD_ROLES } from "@/lib/staff-files";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await staffUser(UPLOAD_ROLES);
    if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    const { id } = await params;

    const file = await prisma.staffFile.findUnique({ where: { id }, select: { key: true, size: true, status: true, uploadedById: true } });
    if (!file || file.uploadedById !== user.id || file.status !== "PENDING") {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const size = await storedSize(file.key);
    if (size == null) return NextResponse.json({ error: "Upload not found in storage." }, { status: 409 });
    // Belt-and-braces with the signed Content-Length: anything that isn't exactly
    // what was declared (or is over the cap) is discarded, never published.
    if (size !== Number(file.size) || size > MAX_STAFF_FILE_BYTES) {
        await deleteStored(file.key).catch(() => {});
        await prisma.staffFile.delete({ where: { id } });
        return NextResponse.json({ error: "Uploaded file didn't match the declared size." }, { status: 422 });
    }
    await prisma.staffFile.update({ where: { id }, data: { status: "READY" } });
    return NextResponse.json({ ok: true });
}
