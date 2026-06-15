// src/app/(app)/admin/forums/page.tsx
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
    createCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    createForum,
    updateForum,
    deleteForum,
    moveForum,
} from "./actions";

export const metadata: Metadata = { title: "Forum management — vegan eating" };
export const dynamic = "force-dynamic";

export default async function ForumAdminPage({
                                                 searchParams,
                                             }: {
    searchParams: { ok?: string; error?: string };
}) {
    await requireRole(["ADMIN"]);
    const categories = await prisma.category.findMany({
        orderBy: { position: "asc" },
        include: {
            forums: { orderBy: { position: "asc" }, include: { _count: { select: { threads: true } } } },
            _count: { select: { forums: true } },
        },
    });

    const banner =
        searchParams?.ok === "1"
            ? { text: "Saved.", good: true }
            : searchParams?.error === "name"
                ? { text: "A name is required.", good: false }
                : searchParams?.error === "notempty"
                    ? { text: "Empty it first — that still has boards or threads inside.", good: false }
                    : null;

    return (
        <div style={{ maxWidth: "none", paddingRight: 40 }}>

            <p style={kicker}>Admin · Forums</p>
            <h1 style={h1}>Categories &amp; boards</h1>
            <p style={{ color: "var(--muted,#6b7264)", marginTop: 8 }}>
                Add, rename, reorder, or remove the structure of the forum. Changes show on the public board right away.
            </p>

            {banner ? (
                <p style={{ ...note, ...(banner.good ? noteGood : noteBad) }}>{banner.text}</p>
            ) : null}

            {/* Add category */}
            <form action={createCategory} style={addBar}>
                <input name="name" className="forum-input" placeholder="New category name" required style={input} />
                <input name="description" placeholder="Description (optional)" style={{ ...input, flex: 2 }} />
                <button style={btnPrimary}>Add category</button>
            </form>

            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 18 }}>
                {categories.map((cat) => (
                    <div key={cat.id} style={card}>
                        {/* Category header: rename + reorder + delete */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <form action={updateCategory} style={{ display: "flex", gap: 8, flex: 1 }}>
                                <input type="hidden" name="id" value={cat.id} />
                                <input name="name" defaultValue={cat.name} style={{ ...input, fontWeight: 600 }} />
                                <input
                                    name="description"
                                    defaultValue={cat.description ?? ""}
                                    placeholder="Description"
                                    style={{ ...input, flex: 2 }}
                                />
                                <button style={btnGhost}>Save</button>
                            </form>
                            <ReorderButtons action={moveCategory} id={cat.id} />
                            <form action={deleteCategory}>
                                <input type="hidden" name="id" value={cat.id} />
                                <button
                                    style={{ ...btnDanger, opacity: cat._count.forums ? 0.4 : 1 }}
                                    disabled={cat._count.forums > 0}
                                    title={cat._count.forums ? "Remove its boards first" : "Delete category"}
                                >
                                    Delete
                                </button>
                            </form>
                        </div>

                        {/* Boards in this category */}
                        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                            {cat.forums.map((f) => (
                                <div key={f.id} style={boardRow}>
                                    <form action={updateForum} style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
                                        <input type="hidden" name="id" value={f.id} />
                                        <input name="name" defaultValue={f.name} style={input} />
                                        <input
                                            name="description"
                                            defaultValue={f.description ?? ""}
                                            placeholder="Description"
                                            style={{ ...input, flex: 2 }}
                                        />
                                        <label style={permLabel} title="Who can post in this board">
                                            <span style={{ opacity: 0.7 }}>Post:</span>
                                            <select name="postMinRole" defaultValue={f.postMinRole} style={select}>
                                                <option value="MEMBER">Everyone</option>
                                                <option value="MODERATOR">Mods &amp; admins</option>
                                                <option value="ADMIN">Admins only</option>
                                            </select>
                                        </label>
                                        <button style={btnGhost}>Save</button>
                                    </form>
                                    <span style={countTag}>{f._count.threads} threads</span>
                                    <ReorderButtons action={moveForum} id={f.id} />
                                    <form action={deleteForum}>
                                        <input type="hidden" name="id" value={f.id} />
                                        <button
                                            style={{ ...btnDanger, opacity: f._count.threads ? 0.4 : 1 }}
                                            disabled={f._count.threads > 0}
                                            title={f._count.threads ? "Has threads — can't delete" : "Delete board"}
                                        >
                                            Delete
                                        </button>
                                    </form>
                                </div>
                            ))}

                            {/* Add board to this category */}
                            <form action={createForum} style={{ ...boardRow, background: "transparent", border: "1px dashed var(--line,#d9d5c8)" }}>
                                <input type="hidden" name="categoryId" value={cat.id} />
                                <input name="name" placeholder="New board name" required style={input} />
                                <input name="description" placeholder="Description (optional)" style={{ ...input, flex: 2 }} />
                                <label style={permLabel} title="Who can post in this board">
                                    <span style={{ opacity: 0.7 }}>Post:</span>
                                    <select name="postMinRole" defaultValue="MEMBER" style={select}>
                                        <option value="MEMBER">Everyone</option>
                                        <option value="MODERATOR">Mods &amp; admins</option>
                                        <option value="ADMIN">Admins only</option>
                                    </select>
                                </label>
                                <button style={btnPrimary}>Add board</button>
                            </form>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ReorderButtons({ action, id }: { action: (fd: FormData) => void; id: string }) {
    return (
        <div style={{ display: "flex", gap: 4 }}>
            {(["up", "down"] as const).map((dir) => (
                <form key={dir} action={action}>
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="dir" value={dir} />
                    <button style={btnArrow} title={`Move ${dir}`}>{dir === "up" ? "↑" : "↓"}</button>
                </form>
            ))}
        </div>
    );
}

/* styles */
const kicker: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--terra,#c2603a)" };
const h1: React.CSSProperties = { fontFamily: 'var(--display,"Fraunces",serif)', fontSize: 30, color: "var(--ink,#1c2317)", margin: "8px 0 0" };
const note: React.CSSProperties = { marginTop: 16, padding: "10px 14px", borderRadius: 10, fontSize: 14 };
const noteGood: React.CSSProperties = { background: "rgba(91,107,63,0.12)", border: "1px solid rgba(91,107,63,0.35)", color: "#41502a" };
const noteBad: React.CSSProperties = { background: "rgba(194,96,58,0.10)", border: "1px solid rgba(194,96,58,0.35)", color: "#9a3f1f" };
const addBar: React.CSSProperties = { marginTop: 22, display: "flex", gap: 8, alignItems: "center" };
const card: React.CSSProperties = { background: "#faf8f1", border: "1px solid var(--line,#e6e3da)", borderRadius: 14, padding: "16px 16px" };
const boardRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid var(--line,#e6e3da)", borderRadius: 10, padding: "8px 10px" };
const input: React.CSSProperties = { flex: 1, minWidth: 0, border: "1px solid var(--line,#d9d5c8)", borderRadius: 8, padding: "8px 10px", fontSize: 14, background: "#fff", color: "var(--ink,#1c2317)" };
const countTag: React.CSSProperties = { fontSize: 12, color: "var(--muted,#6b7264)", whiteSpace: "nowrap" };
const btnPrimary: React.CSSProperties = { border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 13.5, fontWeight: 600, background: "var(--terra,#c2603a)", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" };
const btnGhost: React.CSSProperties = { border: "1px solid var(--line,#d9d5c8)", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600, background: "transparent", color: "var(--ink,#1c2317)", cursor: "pointer" };
const btnDanger: React.CSSProperties = { border: "1px solid rgba(194,96,58,0.4)", borderRadius: 999, padding: "8px 12px", fontSize: 13, fontWeight: 600, background: "transparent", color: "#9a3f1f", cursor: "pointer" };
const btnArrow: React.CSSProperties = { border: "1px solid var(--line,#d9d5c8)", borderRadius: 8, width: 30, height: 30, fontSize: 14, background: "#fff", color: "var(--ink,#1c2317)", cursor: "pointer" };
const select: React.CSSProperties = { border: "1px solid var(--line,#d9d5c8)", borderRadius: 8, padding: "7px 8px", fontSize: 13, background: "#fff", color: "var(--ink,#1c2317)", cursor: "pointer" };
const permLabel: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted,#6b7264)", whiteSpace: "nowrap" };