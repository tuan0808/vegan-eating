// src/app/api/staff-files/move/route.ts
// Move files and/or folders into a folder (or back to the top level). Same
// ownership rules as delete: STAFF may move only files they uploaded, and only
// folders they created whose contents are all theirs; ADMIN may move anything.
// Folders are DB-only, so this never touches storage.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allFolders, staffUser, subtreeIds, UPLOAD_ROLES } from "@/lib/staff-files";

export const runtime = "nodejs";

const MAX_ITEMS = 500;

function stringIds(raw: unknown): string[] {
    return Array.isArray(raw) ? [...new Set(raw.filter((x): x is string => typeof x === "string"))] : [];
}

export async function POST(req: NextRequest) {
    const user = await staffUser(UPLOAD_ROLES);
    if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    const isAdmin = user.role === "ADMIN";

    const body = await req.json().catch(() => null);
    const fileIds = stringIds(body?.ids);
    let folderIds = stringIds(body?.folderIds);
    if (fileIds.length + folderIds.length === 0) return NextResponse.json({ error: "Pick at least one item." }, { status: 400 });
    if (fileIds.length + folderIds.length > MAX_ITEMS) {
        return NextResponse.json({ error: `Move at most ${MAX_ITEMS} items at a time.` }, { status: 400 });
    }
    const folderId = typeof body?.folderId === "string" && body.folderId ? body.folderId : null;

    const folders = await allFolders();
    if (folderId && !folders.some((f) => f.id === folderId)) {
        return NextResponse.json({ error: "That folder no longer exists." }, { status: 404 });
    }

    // --- Folders ---
    if (folderIds.some((id) => !folders.some((f) => f.id === id))) {
        return NextResponse.json({ error: "Some of those folders no longer exist." }, { status: 404 });
    }
    // A folder whose ancestor is also selected travels with that ancestor.
    const subtrees = new Map(folderIds.map((id) => [id, subtreeIds(folders, id)]));
    folderIds = folderIds.filter((id) => !folderIds.some((other) => other !== id && subtrees.get(other)!.includes(id)));
    if (folderId && folderIds.some((id) => subtrees.get(id)!.includes(folderId))) {
        return NextResponse.json({ error: "A folder can't be moved into itself or one of its subfolders." }, { status: 400 });
    }
    if (!isAdmin && folderIds.length) {
        const inside = folderIds.flatMap((id) => subtrees.get(id)!);
        if (folders.some((f) => inside.includes(f.id) && f.createdById !== user.id)) {
            return NextResponse.json({ error: "You can only move folders you created." }, { status: 403 });
        }
        const othersFile = await prisma.staffFile.findFirst({
            where: { folderId: { in: inside }, uploadedById: { not: user.id } },
            select: { id: true },
        });
        if (othersFile) {
            return NextResponse.json(
                { error: "A folder contains files from other people. Ask an admin to move it." },
                { status: 403 },
            );
        }
    }
    // Folder names are unique (case-insensitively) among siblings.
    const moving = folders.filter((f) => folderIds.includes(f.id) && f.parentId !== folderId);
    const taken = new Set(
        folders.filter((f) => f.parentId === folderId && !folderIds.includes(f.id)).map((f) => f.name.toLowerCase()),
    );
    for (const f of moving) {
        const key = f.name.toLowerCase();
        if (taken.has(key)) {
            return NextResponse.json({ error: `A folder named "${f.name}" already exists there.` }, { status: 409 });
        }
        taken.add(key);
    }

    // --- Files ---
    const files = await prisma.staffFile.findMany({ where: { id: { in: fileIds } }, select: { id: true, uploadedById: true } });
    if (files.length !== fileIds.length) return NextResponse.json({ error: "Some of those files no longer exist." }, { status: 404 });
    if (!isAdmin && files.some((f) => f.uploadedById !== user.id)) {
        return NextResponse.json({ error: "You can only move files you uploaded." }, { status: 403 });
    }

    await prisma.$transaction([
        prisma.staffFile.updateMany({ where: { id: { in: fileIds } }, data: { folderId } }),
        prisma.staffFolder.updateMany({ where: { id: { in: moving.map((f) => f.id) } }, data: { parentId: folderId } }),
    ]);
    return NextResponse.json({ ok: true, files: fileIds.length, folders: moving.length });
}
