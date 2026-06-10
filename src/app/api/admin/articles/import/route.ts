// src/app/api/admin/articles/import/route.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { COLUMNS, cellValue, rowToData, isArticleChanged, type ArticleData } from "@/lib/article-xlsx";
import { handleXlsxImport } from "@/lib/xlsx-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    return handleXlsxImport<ArticleData>(req, {
        columns: COLUMNS,
        cellValue,
        rowToData,
        isChanged: isArticleChanged,
        findMany: () => prisma.article.findMany() as unknown as Promise<Record<string, unknown>[]>,
        create: (data) => prisma.article.create({ data: data as never }),
        update: (slug, data) => prisma.article.update({ where: { slug }, data: data as never }),
        revalidate: ["/admin/articles", "/articles"],
    });
}