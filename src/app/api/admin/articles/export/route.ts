// src/app/api/admin/news/export/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { COLUMNS, newsToRow } from "@/lib/news-xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Roomier widths for the long text columns.
const WIDTHS: Record<string, number> = {
    description: 60, link: 42, image: 36, title: 38, slug: 28,
    externalId: 30, categories: 22, source: 22, pubDate: 26,
};

export async function GET() {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const rows = await prisma.newsArticle.findMany({ orderBy: { pubDate: "desc" } });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("News");
    ws.columns = COLUMNS.map((c) => ({ header: c, key: c, width: WIDTHS[c] ?? 16 }));

    for (const r of rows) {
        ws.addRow(newsToRow(r as unknown as Record<string, unknown>));
    }

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(buffer as ArrayBuffer, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="vegan-eating-news-${date}.xlsx"`,
            "Cache-Control": "no-store",
        },
    });
}