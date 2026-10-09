// src/app/(app)/admin/files/upload/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UPLOAD_ROLES, allFolders, folderOptions, staffUser } from "@/lib/staff-files";
import StaffUploader from "./StaffUploader";
import { h1, kicker, muted } from "../styles";

export const metadata: Metadata = { title: "Upload — staff files" };
export const dynamic = "force-dynamic";

export default async function StaffUploadPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
    // DB-backed check, not the JWT role: a demoted/banned user loses access at once.
    if (!(await staffUser(UPLOAD_ROLES))) redirect("/dashboard");
    const { folder } = await searchParams;
    const options = folderOptions(await allFolders());
    const initialFolder = options.some((o) => o.id === folder) ? folder! : null;
    return (
        <div style={{ maxWidth: 760, paddingRight: 40 }}>
            <p style={kicker}>Admin · Staff files</p>
            <h1 style={h1}>Upload</h1>
            <p style={{ ...muted, marginTop: 8 }}>
                Share raw footage or other files with staff for review. Up to 3 GB per file. Files are private —
                only staff and admins can download them. Keep this tab open until each upload finishes.
            </p>
            <StaffUploader folders={options} initialFolder={initialFolder} />
        </div>
    );
}
