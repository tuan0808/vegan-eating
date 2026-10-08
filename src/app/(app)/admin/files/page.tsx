// src/app/(app)/admin/files/page.tsx
// Downloads — browse the shared staff repository folder by folder (?folder=<id>).
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DOWNLOAD_ROLES, UPLOAD_ROLES, allFolders, folderPath, staffUser, formatBytes } from "@/lib/staff-files";
import DeleteFileButton from "./DeleteFileButton";
import { FolderRowActions, NewFolderButton } from "./FolderControls";
import { card, h1, kicker, muted } from "./styles";

export const metadata: Metadata = { title: "Downloads — staff files" };
export const dynamic = "force-dynamic";

export default async function StaffDownloadsPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
    // DB-backed check, not the JWT role: a demoted/banned user loses access at once.
    const me = await staffUser(DOWNLOAD_ROLES);
    if (!me) redirect("/dashboard");
    const canUpload = UPLOAD_ROLES.includes(me.role);
    const isAdmin = me.role === "ADMIN";

    const { folder: folderParam } = await searchParams;
    const folders = await allFolders();
    const path = folderPath(folders, folderParam ?? null);
    const current = path.at(-1) ?? null;
    // Unknown/deleted folder id → back to the top level rather than an empty page.
    if (folderParam && !current) redirect("/admin/files");
    const folderId = current?.id ?? null;

    const subfolders = await prisma.staffFolder.findMany({
        where: { parentId: folderId },
        orderBy: { name: "asc" },
        select: {
            id: true, name: true, createdAt: true, createdById: true,
            createdBy: { select: { name: true, username: true } },
            _count: { select: { files: { where: { status: "READY" } }, children: true } },
        },
    });
    const files = await prisma.staffFile.findMany({
        where: { status: "READY", folderId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true, name: true, size: true, note: true, createdAt: true, uploadedById: true,
            uploadedBy: { select: { name: true, username: true } },
        },
    });

    return (
        <div style={{ maxWidth: 1000, paddingRight: 40 }}>
            <p style={kicker}>Admin · Staff files</p>
            <h1 style={h1}>Downloads</h1>
            <p style={{ ...muted, marginTop: 8 }}>
                Shared files from staff for review. Links are private and expire shortly after you click them.
            </p>

            <nav style={{ marginTop: 20, fontSize: 14.5, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <Link href="/admin/files" style={current ? crumb : crumbCurrent}>All files</Link>
                {path.map((f, i) => (
                    <span key={f.id} style={{ display: "inline-flex", gap: 6 }}>
                        <span style={muted}>/</span>
                        {i === path.length - 1 ? (
                            <span style={crumbCurrent}>{f.name}</span>
                        ) : (
                            <Link href={`/admin/files?folder=${f.id}`} style={crumb}>{f.name}</Link>
                        )}
                    </span>
                ))}
            </nav>

            {canUpload && (
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
                    <NewFolderButton parentId={folderId} />
                    <Link
                        href={folderId ? `/admin/files/upload?folder=${folderId}` : "/admin/files/upload"}
                        style={{ color: "var(--terra, #c2603a)", fontWeight: 600 }}
                    >
                        Upload {current ? "to this folder" : "a file"} →
                    </Link>
                </div>
            )}

            <div style={{ ...card, marginTop: 24, padding: 0, overflowX: "auto" }}>
                {files.length === 0 && subfolders.length === 0 ? (
                    <p style={{ ...muted, padding: 20, margin: 0 }}>{current ? "This folder is empty." : "No files yet."}</p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", ...muted, fontSize: 12.5 }}>
                                <th style={th}>File</th>
                                <th style={th}>Size</th>
                                <th style={th}>Added by</th>
                                <th style={th}>Date</th>
                                <th style={th} />
                            </tr>
                        </thead>
                        <tbody>
                            {subfolders.map((f) => (
                                <tr key={f.id} style={{ borderTop: "1px solid var(--line, #e6e3da)" }}>
                                    <td style={td}>
                                        <Link href={`/admin/files?folder=${f.id}`} style={{ color: "var(--ink, #1c2317)", fontWeight: 600, wordBreak: "break-all" }}>
                                            <span aria-hidden style={{ marginRight: 8 }}>📁</span>
                                            {f.name}
                                        </Link>
                                    </td>
                                    <td style={{ ...td, ...muted, whiteSpace: "nowrap" }}>
                                        {itemCount(f._count.children + f._count.files)}
                                    </td>
                                    <td style={td}>{f.createdBy.name ?? f.createdBy.username}</td>
                                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                                        {f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </td>
                                    <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                                        {canUpload && (
                                            <FolderRowActions
                                                id={f.id}
                                                name={f.name}
                                                canRename={isAdmin}
                                                canDelete={isAdmin || f.createdById === me.id}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {files.map((f) => (
                                <tr key={f.id} style={{ borderTop: "1px solid var(--line, #e6e3da)" }}>
                                    <td style={td}>
                                        <a
                                            href={`/api/staff-files/${f.id}/download`}
                                            style={{ color: "var(--ink, #1c2317)", fontWeight: 600, wordBreak: "break-all" }}
                                        >
                                            {f.name}
                                        </a>
                                        {f.note && <div style={{ ...muted, fontSize: 13, marginTop: 4 }}>{f.note}</div>}
                                    </td>
                                    <td style={{ ...td, whiteSpace: "nowrap" }}>{formatBytes(Number(f.size))}</td>
                                    <td style={td}>{f.uploadedBy.name ?? f.uploadedBy.username}</td>
                                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                                        {f.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </td>
                                    <td style={{ ...td, whiteSpace: "nowrap", textAlign: "right" }}>
                                        <a href={`/api/staff-files/${f.id}/download`} style={{ color: "var(--terra, #c2603a)", fontWeight: 600, marginRight: 12 }}>
                                            Download
                                        </a>
                                        {(f.uploadedById === me.id || me.role === "ADMIN") && <DeleteFileButton id={f.id} name={f.name} />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

function itemCount(n: number): string {
    return n === 0 ? "Empty" : `${n} item${n === 1 ? "" : "s"}`;
}

const crumb: React.CSSProperties = { color: "var(--terra, #c2603a)", fontWeight: 600 };
const crumbCurrent: React.CSSProperties = { color: "var(--ink, #1c2317)", fontWeight: 700 };
const th: React.CSSProperties = { padding: "12px 16px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "12px 16px", verticalAlign: "top" };
