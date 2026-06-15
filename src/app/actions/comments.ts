// src/app/actions/comments.ts
'use server'

import sanitizeHtml from 'sanitize-html'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { guardCommunityPost } from '@/lib/anti-spam'
import type { CommentFormState, CommentTarget } from '@/lib/comments'

export async function createComment(
    _prevState: CommentFormState,
    formData: FormData,
): Promise<CommentFormState> {
    // One shared gate: sign-in + verified + not-banned + IP blocklist + rate limit.
    // The callback tells the gate how to count THIS surface (comments) for rate limiting.
    const guard = await guardCommunityPost(async (userId) => {
        const hourAgo = new Date(Date.now() - 3_600_000)
        const [last, lastHourCount] = await Promise.all([
            prisma.comment.findFirst({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
            prisma.comment.count({ where: { userId, createdAt: { gte: hourAgo } } }),
        ])
        return { lastAt: last?.createdAt ?? null, lastHourCount }
    })
    if (!guard.ok) return { error: guard.error, success: false }
    const { userId, authorName, ip, userAgent } = guard

    const rawBody = String(formData.get('body') ?? '').trim()
    const parentId = formData.get('parentId') ? String(formData.get('parentId')) : null
    const path = String(formData.get('path') ?? '/')

    if (!rawBody) return { error: 'Write something first.', success: false }
    if (rawBody.length > 5000) return { error: 'That comment is too long.', success: false }

    // strip ALL tags — comments are plaintext, line breaks preserved
    const body = sanitizeHtml(rawBody, { allowedTags: [], allowedAttributes: {} })
    if (!body.trim()) return { error: 'Write something first.', success: false }

    // exactly one target — recipe (string slug) or article (Int)
    const recipeIdRaw = formData.get('recipeId')
    const articleIdRaw = formData.get('articleId')
    let target: CommentTarget | null = null
    if (recipeIdRaw) {
        target = { recipeId: String(recipeIdRaw) }
    } else if (articleIdRaw) {
        const n = Number(articleIdRaw)
        if (Number.isInteger(n)) target = { articleId: n }
    }
    if (!target) {
        return { error: 'Something went wrong attaching this comment.', success: false }
    }

    // A reply must point at a real comment.
    if (parentId) {
        const parent = await prisma.comment.findUnique({ where: { id: parentId }, select: { id: true } })
        if (!parent) return { error: 'That comment no longer exists.', success: false }
    }

    try {
        await prisma.comment.create({
            data: { body, authorName, userId, ipAddress: ip, userAgent, parentId, ...target },
        })
    } catch {
        return { error: 'Could not post your comment. Try again.', success: false }
    }

    revalidatePath(path)
    return { error: null, success: true, key: Date.now() }
}