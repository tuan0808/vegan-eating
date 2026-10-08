// src/app/api/staff-folders/route.ts
// Create a folder in the staff file repository (STAFF + ADMIN).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanFolderName, staffUser, UPLOAD_ROLES } from "@/lib/staff-files";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const user = await staffUser(UPLOAD_ROLES);
    if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    const body = await req.json().catch(() => null);
    const name = cleanFolderName(body?.name);
    if (!name) return NextResponse.json({ error: "Folder names must be 1–100 characters." }, { status: 400 });
    const parentId = typeof body?.parentId === "string" && body.parentId ? body.parentId : null;

    if (parentId && !(await prisma.staffFolder.findUnique({ where: { id: parentId }, select: { id: true } }))) {
        return NextResponse.json({ error: "That parent folder no longer exists." }, { status: 404 });
    }
    const clash = await prisma.staffFolder.findFirst({
        where: { parentId, name: { equals: name, mode: "insensitive" } },
        select: { id: true },
    });
    if (clash) return NextResponse.json({ error: "A folder with that name already exists here." }, { status: 409 });

    const folder = await prisma.staffFolder.create({
        data: { name, parentId, createdById: user.id },
        select: { id: true, name: true, parentId: true },
    });
    return NextResponse.json(folder);
}
