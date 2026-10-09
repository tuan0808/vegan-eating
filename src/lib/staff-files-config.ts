// Client-safe constants for staff file sharing (staff-files.ts pulls in auth/Prisma).
export const MAX_STAFF_FILE_BYTES = 3 * 1024 ** 3; // 3 GB per file (single presigned PUT; S3/Spaces cap is 5 GB)
