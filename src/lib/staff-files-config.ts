// Client-safe constants for staff file sharing (staff-files.ts pulls in auth/Prisma).
export const MAX_STAFF_FILE_BYTES = 3 * 1024 ** 3; // 3 GB per file (single presigned PUT; S3/Spaces cap is 5 GB)

// Image types the Downloads page previews inline (thumbnail + modal). Anything else
// is download-only: videos get a placeholder so nobody streams a multi-GB file.
export const PREVIEW_IMAGE_TYPES = [
    "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/svg+xml", "image/bmp",
];
// Above this, the list shows a placeholder instead of loading the full image as a
// thumbnail (there are no generated thumbnails); the modal still loads it on click.
export const MAX_THUMB_BYTES = 15 * 1024 ** 2;

export type FileKind = "image" | "video" | "file";

export function fileKind(contentType: string): FileKind {
    if (PREVIEW_IMAGE_TYPES.includes(contentType)) return "image";
    if (contentType.startsWith("video/")) return "video";
    return "file";
}
