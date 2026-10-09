// src/lib/staff-files.ts
// Private staff file repository (raw video etc.). Unlike /api/upload (public CDN
// images), these objects are written with a PRIVATE ACL and are only reachable
// through short-lived presigned URLs handed out after a role check.
//
// Large files never pass through the app server in production: the browser PUTs
// straight to Spaces with a presigned URL and downloads via a presigned GET.
// Without Spaces (dev) we fall back to local disk under .staff-files/, proxied by
// /api/staff-files/[id]/blob.
//
// Spaces bucket CORS must allow PUT + GET from the site origin with the
// Content-Type header, or browser uploads will fail the preflight.

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type * as FsPromises from "node:fs/promises";
import type * as NodePath from "node:path";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MAX_STAFF_FILE_BYTES } from "@/lib/staff-files-config";

export { MAX_STAFF_FILE_BYTES };
// Permission matrix for the shared repository:
//   STAFF  — upload, download, delete their OWN files
//   MEDIA  — download only (third-party access; no upload, no delete)
//   ADMIN  — everything, including deleting anyone's files
export const DOWNLOAD_ROLES = ["STAFF", "MEDIA", "ADMIN"];
export const UPLOAD_ROLES = ["STAFF", "ADMIN"];
/** Extra headers the browser must send on the upload PUT (they're signed). */
export const UPLOAD_HEADERS = { "x-amz-acl": "private" } as const;

const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT;
const SPACES_BUCKET = process.env.SPACES_BUCKET;
const SPACES_KEY = process.env.SPACES_KEY;
const SPACES_SECRET = process.env.SPACES_SECRET;
const SPACES_REGION = process.env.SPACES_REGION || "us-east-1"; // Spaces ignores this; SDK requires a value

export const spacesEnabled = Boolean(SPACES_ENDPOINT && SPACES_BUCKET && SPACES_KEY && SPACES_SECRET);
// Production must never fall back to local disk: App Platform's fs is ephemeral,
// so files would silently vanish on redeploy.
export const storageAvailable = spacesEnabled || process.env.NODE_ENV !== "production";

let _s3: S3Client | null = null;
function s3(): S3Client {
    if (!_s3) {
        _s3 = new S3Client({
            endpoint: SPACES_ENDPOINT,
            region: SPACES_REGION,
            forcePathStyle: false,
            credentials: { accessKeyId: SPACES_KEY!, secretAccessKey: SPACES_SECRET! },
        });
    }
    return _s3;
}

// Same turbopackIgnore'd lazy imports as spaces-upload.ts, so the dev-only disk
// paths don't get traced into the build.
let _fs: Promise<typeof FsPromises> | null = null;
function fsp(): Promise<typeof FsPromises> {
    return (_fs ??= import(/* turbopackIgnore: true */ "node:fs/promises"));
}
let _path: Promise<typeof NodePath> | null = null;
function nodePath(): Promise<typeof NodePath> {
    return (_path ??= import(/* turbopackIgnore: true */ "node:path"));
}

/** Absolute dev path for a key. Keys are server-generated, but guard traversal anyway. */
export async function localPath(key: string): Promise<string> {
    const { join, sep } = await nodePath();
    const root = join(process.cwd(), ".staff-files");
    const abs = join(root, ...key.split("/"));
    if (!abs.startsWith(root + sep)) throw new Error("Bad key");
    return abs;
}

/**
 * Returns the user if their role is in `roles`, else null. Reads the role from the DB
 * rather than the JWT so demoting (or banning) someone revokes file access at once,
 * not when their session cookie happens to expire.
 */
export async function staffUser(roles: string[]) {
    const session = await auth();
    if (!session?.user?.id) return null;
    const u = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, banned: true },
    });
    if (!u || u.banned || !roles.includes(u.role)) return null;
    return u;
}

/**
 * Storage key: staff-files/<id>. Deliberately opaque — no filename, date or
 * extension — so a key that leaks (logs, a misconfigured bucket listing) reveals
 * nothing about the content. The real name lives only in the DB.
 */
export function staffFileKey(id: string): string {
    return `staff-files/${id}`;
}

/**
 * Where the browser should PUT the bytes. Content-Length and Content-Type are part
 * of the signature, so the URL only accepts a body of exactly the declared size
 * (enforced by Spaces, not just our /complete check).
 *
 * x-amz-acl is signed as a HEADER (unhoistable), not a query param. With it in
 * the query, Spaces honoured an extra `x-amz-acl: public-read` header on the PUT
 * and made the object world-readable (verified live). As a signed header, any
 * value other than "private" fails the signature. The browser must therefore send
 * every header in UPLOAD_HEADERS exactly.
 */
export async function uploadUrl(id: string, key: string, contentType: string, size: number): Promise<string> {
    if (!spacesEnabled) return `/api/staff-files/${id}/blob`;
    return getSignedUrl(
        s3(),
        new PutObjectCommand({ Bucket: SPACES_BUCKET!, Key: key, ContentType: contentType, ContentLength: size, ACL: "private" }),
        // Expiry is checked when the PUT starts, not when it ends, so an hour is
        // plenty even for a 3 GB file on a slow link.
        {
            expiresIn: 60 * 60,
            signableHeaders: new Set(["content-type", "content-length", "x-amz-acl"]),
            unhoistableHeaders: new Set(["x-amz-acl"]),
        },
    );
}

/** Where the browser should GET the bytes (forced download, original filename). */
export async function downloadUrl(id: string, key: string, name: string): Promise<string> {
    if (!spacesEnabled) return `/api/staff-files/${id}/blob`;
    return getSignedUrl(
        s3(),
        new GetObjectCommand({
            Bucket: SPACES_BUCKET!,
            Key: key,
            ResponseContentDisposition: contentDisposition(name),
        }),
        // Checked at request start, so a short window still covers a long download.
        // Kept short so a copied link is near-useless if it gets passed around.
        { expiresIn: 60 * 5 },
    );
}

/**
 * Where the browser should GET an image for inline preview. Only call for
 * PREVIEW_IMAGE_TYPES: the response type comes from that allowlist, never from
 * the object, and the bytes are served from the Spaces origin, not ours, so an
 * SVG can't script against the site.
 */
export async function viewUrl(id: string, key: string, contentType: string): Promise<string> {
    if (!spacesEnabled) return `/api/staff-files/${id}/blob?inline=1`;
    return getSignedUrl(
        s3(),
        new GetObjectCommand({
            Bucket: SPACES_BUCKET!,
            Key: key,
            ResponseContentType: contentType,
            ResponseContentDisposition: "inline",
        }),
        { expiresIn: 60 * 5 },
    );
}

/** Size of the stored object, or null if it isn't there (upload never finished). */
export async function storedSize(key: string): Promise<number | null> {
    try {
        if (spacesEnabled) {
            const h = await s3().send(new HeadObjectCommand({ Bucket: SPACES_BUCKET!, Key: key }));
            return h.ContentLength ?? null;
        }
        const { stat } = await fsp();
        return (await stat(await localPath(key))).size;
    } catch {
        return null;
    }
}

export async function deleteStored(key: string): Promise<void> {
    if (spacesEnabled) {
        await s3().send(new DeleteObjectCommand({ Bucket: SPACES_BUCKET!, Key: key }));
        return;
    }
    const { rm } = await fsp();
    await rm(await localPath(key), { force: true });
}

/** attachment; filename="..." with an RFC 5987 UTF-8 fallback for non-ASCII names. */
export function contentDisposition(name: string): string {
    const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let v = n / 1024;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

// --- Folders ---------------------------------------------------------------
// Folders are DB-only (storage keys stay flat and opaque), so creating, renaming
// or deleting one never touches Spaces except to remove the files inside it.

export type StaffFolderRow = { id: string; name: string; parentId: string | null; createdById: string };

/** Every folder. The repository is small, so tree work happens in memory. */
export function allFolders(): Promise<StaffFolderRow[]> {
    return prisma.staffFolder.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, parentId: true, createdById: true },
    });
}

/** The folder and all its descendants' ids. */
export function subtreeIds(folders: StaffFolderRow[], rootId: string): string[] {
    const out = [rootId];
    for (let i = 0; i < out.length; i++) {
        for (const f of folders) if (f.parentId === out[i]) out.push(f.id);
    }
    return out;
}

/** Chain from the top level down to `id` (empty if it doesn't exist). */
export function folderPath(folders: StaffFolderRow[], id: string | null): StaffFolderRow[] {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const chain: StaffFolderRow[] = [];
    for (let f = id ? byId.get(id) : undefined; f && chain.length < 100; f = f.parentId ? byId.get(f.parentId) : undefined) {
        chain.unshift(f);
    }
    return chain;
}

/** Folders flattened depth-first with "A / B / C" labels, for pickers. */
export function folderOptions(folders: StaffFolderRow[]): { id: string; label: string; parentId: string | null }[] {
    const out: { id: string; label: string; parentId: string | null }[] = [];
    const walk = (parentId: string | null, prefix: string) => {
        for (const f of folders) {
            if (f.parentId !== parentId) continue;
            const label = prefix ? `${prefix} / ${f.name}` : f.name;
            out.push({ id: f.id, label, parentId: f.parentId });
            walk(f.id, label);
        }
    };
    walk(null, "");
    return out;
}

/** Trimmed folder name, or null if empty / too long / has control characters. */
export function cleanFolderName(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name || name.length > 100 || /[\x00-\x1f\x7f]/.test(name)) return null;
    return name;
}
