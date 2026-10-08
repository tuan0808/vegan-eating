// src/app/api/staff-folders/[id]/route.ts
// Rename (ADMIN only) or delete a staff folder. ADMIN may delete any folder with
// everything in it. STAFF may delete only folders they created, and only when every
// subfolder and file inside is theirs too — otherwise deleting a folder would be a
// back door to deleting other people's files.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allFolders, cleanFolderName, deleteStored, staffUser, subtreeIds, UPLOAD_ROLES } from "@/lib/staff-files";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await staffUser(["ADMIN"]);
    if (!user) return NextResponse.json({ error: "Only admins can rename folders." }, { status: 403 });
    const { id } = await params;

    const body = await req.json().catch(() => null);
    const name = cleanFolderName(body?.name);
    if (!name) return NextResponse.json({ error: "Folder names must be 1–100 characters." }, { status: 400 });

    const folder = await prisma.staffFolder.findUnique({ where: { id }, select: { parentId: true } });
    if (!folder) return NextResponse.json({ error: "Not found." }, { status: 404 });
    const clash = await prisma.staffFolder.findFirst({
        where: { id: { not: id }, parentId: folder.parentId, name: { equals: name, mode: "insensitive" } },
        select: { id: true },
    });
    if (clash) return NextResponse.json({ error: "A folder with that name already exists here." }, { status: 409 });

    await prisma.staffFolder.update({ where: { id }, data: { name } });
    return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await staffUser(UPLOAD_ROLES);
    if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    const { id } = await params;

    const folders = await allFolders();
    const folder = folders.find((f) => f.id === id);
    if (!folder) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const ids = subtreeIds(folders, id);
    const files = await prisma.staffFile.findMany({
        where: { folderId: { in: ids } },
        select: { id: true, key: true, uploadedById: true },
    });

    if (user.role !== "ADMIN") {
        if (folder.createdById !== user.id) {
            return NextResponse.json({ error: "Only the person who created this folder can delete it." }, { status: 403 });
        }
        const othersInside =
            folders.some((f) => ids.includes(f.id) && f.createdById !== user.id) ||
            files.some((f) => f.uploadedById !== user.id);
        if (othersInside) {
            return NextResponse.json(
                { error: "This folder contains files or folders from other people. Ask an admin to delete it." },
                { status: 403 },
            );
        }
    }

    // Stored bytes first: if storage fails we keep the rows, so nothing is orphaned
    // invisibly in the bucket.
    try {
        for (const f of files) await deleteStored(f.key);
    } catch (err) {
        console.error("Staff folder delete failed:", err);
        return NextResponse.json({ error: "Couldn't delete the stored files." }, { status: 502 });
    }
    await prisma.$transaction([
        prisma.staffFile.deleteMany({ where: { id: { in: files.map((f) => f.id) } } }),
        // Subfolders go with it via the parent relation's cascade.
        prisma.staffFolder.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true, files: files.length });
}
