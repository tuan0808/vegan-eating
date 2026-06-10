// src/app/api/admin/recipes/import/route.ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { COLUMNS, cellValue, rowToData, isRecipeChanged, type RecipeData } from "@/lib/recipe-xlsx";
import { handleXlsxImport } from "@/lib/xlsx-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    return handleXlsxImport<RecipeData>(req, {
        columns: COLUMNS,
        cellValue,
        rowToData,
        isChanged: isRecipeChanged,
        findMany: () => prisma.recipe.findMany() as unknown as Promise<Record<string, unknown>[]>,
        create: (data) => prisma.recipe.create({ data: data as never }),
        update: (slug, data) => prisma.recipe.update({ where: { slug }, data: data as never }),
        revalidate: ["/admin/recipes", "/recipes"],
    });
}