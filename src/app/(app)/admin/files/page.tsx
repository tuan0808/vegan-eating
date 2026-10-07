// src/app/(app)/admin/files/page.tsx
// Downloads — every READY file in the shared staff repository.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DOWNLOAD_ROLES, UPLOAD_ROLES, staffUser, formatBytes } from "@/lib/staff-files";
import DeleteFileButton from "./DeleteFileButton";
import { card, h1, kicker, muted } from "./styles";

export const metadata: Metadata = { title: "Downloads — staff files" };
export const dynamic = "force-dynamic";

export default async function StaffDownloadsPage() {
    // DB-backed check, not the JWT role: a demoted/banned user loses access at once.
    const me = await staffUser(DOWNLOAD_ROLES);
    if (!me) redirect("/dashboard");
    const files = await prisma.staffFile.findMany({
        where: { status: "READY" },
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
                Shared files from staff for review. Links are private and expire shortly after you click them.{UPLOAD_ROLES.includes(me.role) && (
                    <>
                        {" "}
                        <Link href="/admin/files/upload" style={{ color: "var(--terra, #c2603a)", fontWeight: 600 }}>
                            Upload a file →
                        </Link>
                    </>
                )}
            </p>

            <div style={{ ...card, marginTop: 24, padding: 0, overflowX: "auto" }}>
                {files.length === 0 ? (
                    <p style={{ ...muted, padding: 20, margin: 0 }}>No files yet.</p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                        <thead>
                            <tr style={{ textAlign: "left", ...muted, fontSize: 12.5 }}>
                                <th style={th}>File</th>
                                <th style={th}>Size</th>
                                <th style={th}>Uploaded by</th>
                                <th style={th}>Date</th>
                                <th style={th} />
                            </tr>
                        </thead>
                        <tbody>
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

const th: React.CSSProperties = { padding: "12px 16px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "12px 16px", verticalAlign: "top" };
