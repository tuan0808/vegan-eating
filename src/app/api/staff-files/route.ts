// src/app/api/staff-files/route.ts
// Step 1 of a staff upload: register the file and hand back where to PUT the bytes.
// The row starts PENDING and only shows in Downloads once /complete verifies it.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_STAFF_FILE_BYTES, staffFileKey, staffUser, UPLOAD_ROLES, storageAvailable, UPLOAD_HEADERS, uploadUrl } from "@/lib/staff-files";

export const runtime = "nodejs";

const MIME_RE = /^[\w.+-]+\/[\w.+-]+$/;

export async function POST(req: NextRequest) {
    const user = await staffUser(UPLOAD_ROLES);
    if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    if (!storageAvailable) return NextResponse.json({ error: "File storage isn't configured." }, { status: 503 });

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 200) : "";
    const size = Number(body?.size);
    const rawType = typeof body?.type === "string" ? body.type : "";
    const contentType = MIME_RE.test(rawType) ? rawType : "application/octet-stream";
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;
    const folderId = typeof body?.folderId === "string" && body.folderId ? body.folderId : null;

    if (!name) return NextResponse.json({ error: "Missing file name." }, { status: 400 });
    if (!Number.isSafeInteger(size) || size <= 0) return NextResponse.json({ error: "Empty file." }, { status: 400 });
    if (size > MAX_STAFF_FILE_BYTES) {
        return NextResponse.json({ error: "Files are limited to 3 GB each." }, { status: 413 });
    }

    if (folderId && !(await prisma.staffFolder.findUnique({ where: { id: folderId }, select: { id: true } }))) {
        return NextResponse.json({ error: "That folder no longer exists." }, { status: 404 });
    }

    // Key is derived from the id; generate it up front so it's one insert.
    const id = crypto.randomUUID();
    const key = staffFileKey(id);
    await prisma.staffFile.create({
        data: { id, name, key, size: BigInt(size), contentType, note, folderId, uploadedById: user.id },
    });

    return NextResponse.json({
        id,
        uploadUrl: await uploadUrl(id, key, contentType, size),
        headers: { "Content-Type": contentType, ...UPLOAD_HEADERS },
    });
}
