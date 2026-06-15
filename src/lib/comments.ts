// src/lib/comments.ts
import { prisma } from '@/lib/prisma' // adjust if your client lives elsewhere
import { Prisma, type Comment } from '@prisma/client'

const PAGE_SIZE = 12

export type CommentTarget =
    | { recipeId: string }
    | { articleId: number } // Article.id is Int

export type CommentNode = Comment & { replies: Comment[] }

export interface CommentPage {
    comments: CommentNode[]
    page: number
    total: number
    totalPages: number
}

export type CommentFormState = {
    error: string | null
    success: boolean
    key?: number
}

export async function getComments(
    target: CommentTarget,
    page = 1,
): Promise<CommentPage> {
    const current = Math.max(1, page)
    const skip = (current - 1) * PAGE_SIZE

    const rootWhere: Prisma.CommentWhereInput = {
        parentId: null,
        status: 'APPROVED',
        ...target,
    }

    const [roots, total] = await Promise.all([
        prisma.comment.findMany({
            where: rootWhere,
            orderBy: { createdAt: 'desc' },
            take: PAGE_SIZE,
            skip,
        }),
        prisma.comment.count({ where: rootWhere }),
    ])

    const rootIds = roots.map((r) => r.id)
    const replies = rootIds.length
        ? await prisma.comment.findMany({
            where: { parentId: { in: rootIds }, status: 'APPROVED' },
            orderBy: { createdAt: 'asc' },
        })
        : []

    const byParent = new Map<string, Comment[]>()
    for (const r of replies) {
        if (!r.parentId) continue
        const arr = byParent.get(r.parentId) ?? []
        arr.push(r)
        byParent.set(r.parentId, arr)
    }

    const comments: CommentNode[] = roots.map((r) => ({
        ...r,
        replies: byParent.get(r.id) ?? [],
    }))

    return {
        comments,
        page: current,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    }
}