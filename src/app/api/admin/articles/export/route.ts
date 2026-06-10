// src/app/api/admin/articles/export/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { COLUMNS, articleToRow } from "@/lib/article-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Roomier widths for the long text columns.
const WIDTHS: Record<string, number> = {
    body: 70, description: 60, ingredients: 50, steps: 60, cookalong: 40, image: 36,
    gallery: 36, sourceUrl: 36, title: 30, slug: 28,
};

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const recipes = await prisma.article.findMany({ orderBy: { sort: "asc" } });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Recipes");
    ws.columns = COLUMNS.map((c) => ({ header: c, key: c, width: WIDTHS[c] ?? 16 }));

    for (const r of recipes) {
        ws.addRow(articleToRow(r as unknown as Record<string, unknown>));
    }

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer as ArrayBuffer, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="vegan-eating-articles-${date}.xlsx"`,
            "Cache-Control": "no-store",
        },
    });
}