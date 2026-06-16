// src/app/api/admin/news/import/route.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { COLUMNS, cellValue, rowToData, isNewsChanged, type NewsData } from "@/lib/news-xlsx";
import { handleXlsxImport } from "@/lib/xlsx-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    return handleXlsxImport<NewsData>(req, {
        columns: COLUMNS,
        cellValue,
        rowToData,
        isChanged: isNewsChanged,
        findMany: () => prisma.newsArticle.findMany() as unknown as Promise<Record<string, unknown>[]>,
        create: (data) => prisma.newsArticle.create({ data: data as never }),
        update: (slug, data) => prisma.newsArticle.update({ where: { slug }, data: data as never }),
        revalidate: ["/admin/news", "/news"],
    });
}