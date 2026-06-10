// src/lib/xlsx-import.ts
//
// Shared engine for the recipe & article import routes. Each route supplies a
// small adapter (its schema mappers + Prisma operations); everything else —
// auth, parsing, the dry-run diff, the apply loop, the response — lives here once.
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";

type Parsed<D> = { slug: string; title: string; sort: number | null; data: D };

export type ImportAdapter<D extends Record<string, unknown>> = {
    columns: readonly string[];
    cellValue: (v: unknown) => string | number | boolean | null;
    rowToData: (row: Record<string, unknown>) => Parsed<D>;
    isChanged: (existing: Record<string, unknown>, data: D) => boolean;
    findMany: () => Promise<Record<string, unknown>[]>;
    create: (data: D & { sort: number }) => Promise<unknown>;
    update: (slug: string, data: D & { sort?: number }) => Promise<unknown>;
    revalidate: string[];
};

export async function handleXlsxImport<D extends Record<string, unknown>>(
    req: NextRequest,
    a: ImportAdapter<D>,
): Promise<NextResponse> {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const mode = new URL(req.url).searchParams.get("mode") === "apply" ? "apply" : "preview";

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file received." }, { status: 400 });
    }

    // Parse the workbook.
    let ws: ExcelJS.Worksheet | undefined;
    try {
        const wb = new ExcelJS.Workbook();
        // @types/node now types Buffer as generic; exceljs expects the base Buffer — cast to bridge.
        await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as Buffer);
        ws = wb.worksheets[0];
    } catch {
        return NextResponse.json({ error: "Could not read that file — is it a valid .xlsx export?" }, { status: 400 });
    }
    if (!ws) return NextResponse.json({ error: "The workbook has no sheets." }, { status: 400 });

    // Map header names -> column index (so column order in the sheet doesn't matter).
    const colIndex: Record<string, number> = {};
    ws.getRow(1).eachCell((cell, col) => {
        colIndex[String(a.cellValue(cell.value)).trim()] = col;
    });

    // Read data rows.
    const rows: Record<string, unknown>[] = [];
    for (let i = 2; i <= ws.rowCount; i++) {
        const row = ws.getRow(i);
        const obj: Record<string, unknown> = {};
        for (const c of a.columns) {
            const idx = colIndex[c];
            obj[c] = idx ? a.cellValue(row.getCell(idx).value) : "";
        }
        if (!String(obj.title ?? "").trim() && !String(obj.slug ?? "").trim()) continue; // skip blank rows
        rows.push(obj);
    }

    // Existing records, keyed by slug.
    const existing = await a.findMany();
    const bySlug = new Map(existing.map((r) => [String(r.slug), r]));

    let created = 0, updated = 0, unchanged = 0;
    const errors: string[] = [];
    const toApply: { slug: string; data: D; sort: number | null; isNew: boolean }[] = [];

    rows.forEach((row, i) => {
        const sheetRow = i + 2;
        const { slug, title, sort, data } = a.rowToData(row);
        if (!title) { errors.push(`Row ${sheetRow}: missing title — skipped.`); return; }
        if (!slug) { errors.push(`Row ${sheetRow}: could not derive a slug — skipped.`); return; }

        const ex = bySlug.get(slug);
        if (!ex) {
            created++;
            toApply.push({ slug, data, sort, isNew: true });
        } else if (a.isChanged(ex, data)) {
            updated++;
            toApply.push({ slug, data, sort, isNew: false });
        } else {
            unchanged++;
        }
    });

    if (mode === "preview") {
        return NextResponse.json({ mode, total: rows.length, created, updated, unchanged, errors });
    }

    // Apply. New records get appended after the current max sort unless the sheet specifies one.
    let maxSort = existing.reduce((m, r) => Math.max(m, (r.sort as number) ?? 0), 0);
    let appliedCreated = 0, appliedUpdated = 0;
    for (const item of toApply) {
        try {
            if (item.isNew) {
                maxSort += 1;
                await a.create({ ...item.data, sort: item.sort ?? maxSort });
                appliedCreated++;
            } else {
                const sortPatch = item.sort != null ? { sort: item.sort } : {};
                await a.update(item.slug, { ...item.data, ...sortPatch });
                appliedUpdated++;
            }
        } catch (e) {
            errors.push(`${item.slug}: ${(e as Error).message}`);
        }
    }

    a.revalidate.forEach((p) => revalidatePath(p));

    return NextResponse.json({ mode, total: rows.length, created: appliedCreated, updated: appliedUpdated, unchanged, errors });
}