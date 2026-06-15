// src/lib/comments-admin.ts
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const ADMIN_PAGE_SIZE = 25
const REVIEWED_KEY = 'comments_reviewed_at'

// A comment joined to whichever piece of content it belongs to.
type CommentWithTargets = Prisma.CommentGetPayload<{
    include: {
        recipe: { select: { id: true; title: true; slug: true } }
        article: { select: { id: true; title: true; slug: true } }
    }
}>

export interface QueueRow {
    id: string
    body: string
    authorName: string
    status: string
    ipAddress: string | null
    createdAt: Date
    isReply: boolean
    target: { type: 'recipe' | 'article'; id: string; title: string; slug: string } | null
}

export interface QueuePage {
    rows: QueueRow[]
    page: number
    total: number
    totalPages: number
}

export interface ContentGroup {
    type: 'recipe' | 'article'
    id: string
    title: string
    slug: string
    count: number
    lastAt: Date | null
}

const targetInclude = {
    recipe: { select: { id: true, title: true, slug: true } },
    article: { select: { id: true, title: true, slug: true } },
} as const

function toRow(c: CommentWithTargets): QueueRow {
    let target: QueueRow['target'] = null
    if (c.recipe) {
        target = { type: 'recipe', id: c.recipe.id, title: c.recipe.title, slug: c.recipe.slug }
    } else if (c.article) {
        target = { type: 'article', id: String(c.article.id), title: c.article.title, slug: c.article.slug }
    }
    return {
        id: c.id,
        body: c.body,
        authorName: c.authorName,
        status: c.status,
        ipAddress: c.ipAddress,
        createdAt: c.createdAt,
        isReply: !!c.parentId,
        target,
    }
}

/** Reverse-chronological queue across all content. Optionally filter by status. */
export async function getCommentQueue(page = 1, status?: string): Promise<QueuePage> {
    const current = Math.max(1, page)
    const skip = (current - 1) * ADMIN_PAGE_SIZE
    const where: Prisma.CommentWhereInput = status ? { status } : {}

    const [rows, total] = await Promise.all([
        prisma.comment.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: ADMIN_PAGE_SIZE,
            skip,
            include: targetInclude,
        }),
        prisma.comment.count({ where }),
    ])

    return {
        rows: rows.map(toRow),
        page: current,
        total,
        totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    }
}

/** Content items that have comments, ranked by most recent activity. */
export async function getContentWithComments(): Promise<ContentGroup[]> {
    const [recipeGroups, articleGroups] = await Promise.all([
        prisma.comment.groupBy({
            by: ['recipeId'],
            where: { recipeId: { not: null } },
            _count: { _all: true },
            _max: { createdAt: true },
        }),
        prisma.comment.groupBy({
            by: ['articleId'],
            where: { articleId: { not: null } },
            _count: { _all: true },
            _max: { createdAt: true },
        }),
    ])

    const recipeIds = recipeGroups.map((g) => g.recipeId!).filter(Boolean)
    const articleIds = articleGroups.map((g) => g.articleId!).filter(Boolean)

    const [recipes, articles] = await Promise.all([
        prisma.recipe.findMany({ where: { id: { in: recipeIds } }, select: { id: true, title: true, slug: true } }),
        prisma.article.findMany({ where: { id: { in: articleIds } }, select: { id: true, title: true, slug: true } }),
    ])
    const recipeMap = new Map(recipes.map((r) => [r.id, r]))
    const articleMap = new Map(articles.map((a) => [a.id, a]))

    const groups: ContentGroup[] = []
    for (const g of recipeGroups) {
        const r = recipeMap.get(g.recipeId!)
        if (r) groups.push({ type: 'recipe', id: r.id, title: r.title, slug: r.slug, count: g._count._all, lastAt: g._max.createdAt })
    }
    for (const g of articleGroups) {
        const a = articleMap.get(g.articleId!)
        if (a) groups.push({ type: 'article', id: String(a.id), title: a.title, slug: a.slug, count: g._count._all, lastAt: g._max.createdAt })
    }

    groups.sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0))
    return groups
}

/** Every comment on one piece of content (all statuses), newest first. */
export async function getContentThread(type: 'recipe' | 'article', id: string): Promise<QueueRow[]> {
    const where: Prisma.CommentWhereInput =
        type === 'article' ? { articleId: Number(id) } : { recipeId: id }
    const rows = await prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: targetInclude,
    })
    return rows.map(toRow)
}

/** Count of APPROVED comments newer than the admin's last "mark reviewed". */
export async function getNewCommentCount(): Promise<number> {
    const marker = await prisma.setting.findUnique({ where: { key: REVIEWED_KEY } })
    const where: Prisma.CommentWhereInput = marker
        ? { status: 'APPROVED', createdAt: { gt: new Date(marker.value) } }
        : { status: 'APPROVED' }
    return prisma.comment.count({ where })
}

export function fmtStamp(d: Date): string {
    return new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
}